import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  ClientStatus,
  DocumentVersionChangeType,
  ExpirationPolicy,
  ExpirationSource,
  InboxProcessingStatus,
  MatchConfidence,
  Prisma,
  ReviewStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { JobRunContext } from '@/core/jobs/interfaces/jobs.interface';
import { ActivityService } from '@/modules/activity/activity.service';
import { ProgressService } from '@/modules/assignments/services/progress.service';
import { addDays, dateOnly, safeZone } from '@/shared/utils/dates/dates.utils';
import { sha256 } from '@/shared/utils/crypto/crypto.utils';

/**
 * DOCUMENT_PROCESSING job: everything that follows a successful upload. Idempotent — a document
 * already marked `processed` is skipped, so the job can safely run more than once.
 */
@Injectable()
export class DocumentProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly progress: ProgressService,
    private readonly activity: ActivityService,
    private readonly cache: AppCacheService,
  ) {}

  async process(documentId: string, ctx: JobRunContext) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        organization: { select: { time_zone: true } },
        assignment_requirement: { include: { document_requirement: true } },
        public_submission: true,
      },
    });
    if (!doc || doc.deleted_at) return { skipped: 'not_found' };
    const metadata = (doc.metadata ?? {}) as Record<string, any>;
    if (metadata.processed) return { skipped: 'already_processed' };

    // 1. Checksum + duplicate detection.
    const content = await this.storage.get(doc.storage_key);
    const checksum = sha256(content);
    ctx.log('checksum computed', { bytes: content.length });
    const duplicate = await this.prisma.document.findFirst({
      where: { organization_id: doc.organization_id, checksum_sha256: checksum, id: { not: doc.id }, deleted_at: null },
      select: { id: true, title: true, client_id: true },
      orderBy: { uploaded_at: 'asc' },
    });

    // 2. Expiration derived from the requirement's policy (unless entered manually).
    const req = doc.assignment_requirement?.document_requirement;
    let expiration = doc.expiration_date;
    let expirationSource = doc.expiration_source;
    if (!expiration && req) {
      if (req.expiration_policy === ExpirationPolicy.FROM_UPLOAD_DATE && req.expiration_days) {
        const uploadedLocal = DateTime.fromJSDate(doc.uploaded_at).setZone(safeZone(doc.organization.time_zone)).toISODate();
        expiration = addDays(dateOnly(uploadedLocal), req.expiration_days);
        expirationSource = ExpirationSource.CALCULATED;
      } else if (req.expiration_policy === ExpirationPolicy.FIXED_DATE && req.fixed_expiration_date) {
        expiration = req.fixed_expiration_date;
        expirationSource = ExpirationSource.FIXED;
      }
    }

    // 3. Review state: approval not required → approved automatically.
    const autoApprove = !!req && !req.requires_approval && doc.review_status === ReviewStatus.PENDING;
    const reviewStatus = autoApprove ? ReviewStatus.APPROVED : doc.review_status;

    const inbox = await this.buildInboxItem(doc, req, duplicate?.id ?? null);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: doc.id },
        data: {
          checksum_sha256: checksum,
          expiration_date: expiration,
          expiration_source: expirationSource,
          review_status: reviewStatus,
          reviewed_at: autoApprove ? new Date() : doc.reviewed_at,
          metadata: { ...metadata, processed: true, duplicate_of: duplicate?.id ?? null } as Prisma.InputJsonValue,
        },
      });
      if (autoApprove || expiration?.getTime() !== doc.expiration_date?.getTime()) {
        const last = await tx.documentVersion.findFirst({ where: { document_id: doc.id }, orderBy: { version_number: 'desc' } });
        await tx.documentVersion.create({
          data: {
            organization_id: doc.organization_id,
            document_id: doc.id,
            version_number: (last?.version_number ?? 0) + 1,
            change_type: autoApprove ? DocumentVersionChangeType.REVIEW_CHANGED : DocumentVersionChangeType.EXPIRATION_CHANGED,
            original_filename: updated.original_filename,
            storage_key: updated.storage_key,
            mime_type: updated.mime_type,
            size_bytes: updated.size_bytes,
            expiration_date: updated.expiration_date,
            review_status: updated.review_status,
            change_reason: autoApprove ? 'Approval not required for this document' : 'Expiration derived from the requirement policy',
          },
        });
      }
      const existing = await tx.documentInboxItem.findFirst({ where: { document_id: doc.id } });
      if (existing) await tx.documentInboxItem.update({ where: { id: existing.id }, data: inbox });
      else await tx.documentInboxItem.create({ data: { ...inbox, organization_id: doc.organization_id, document_id: doc.id } as any });

      if (duplicate) {
        await this.activity.log(
          {
            organizationId: doc.organization_id,
            action: 'document.duplicate_detected',
            entityType: 'document',
            entityId: doc.id,
            documentId: doc.id,
            clientId: doc.client_id,
            assignmentId: doc.assignment_id,
            description: `${doc.original_filename} is identical to a file already on record`,
            metadata: { duplicate_of: duplicate.id },
          },
          tx,
        );
      }
      if (doc.assignment_id) await this.progress.recalcAssignment(doc.assignment_id, tx);
    });
    ctx.log('document processed', { auto_approved: autoApprove, duplicate: !!duplicate });

    await this.cache.invalidateOrganization(doc.organization_id);
    return { checksum, duplicate_of: duplicate?.id ?? null, auto_approved: autoApprove, expiration_date: expiration?.toISOString().slice(0, 10) ?? null };
  }

  /** Inbox entry: portal/employee uploads arrive High + Matched; public uploads need matching. */
  private async buildInboxItem(
    doc: Prisma.DocumentGetPayload<{ include: { public_submission: true; assignment_requirement: true } }>,
    req: { requires_approval: boolean; name: string } | undefined,
    duplicateOf: string | null,
  ): Promise<Prisma.DocumentInboxItemUncheckedUpdateInput> {
    if (doc.assignment_requirement_id && req) {
      const needsReview = req.requires_approval && doc.review_status === ReviewStatus.PENDING;
      return {
        source: doc.source,
        processing_status: duplicateOf ? InboxProcessingStatus.DUPLICATE : InboxProcessingStatus.MATCHED,
        needs_review: needsReview,
        requires_approval: req.requires_approval,
        is_verified: doc.is_verified,
        detected_client_id: doc.client_id,
        detected_document_type: req.name,
        suggested_assignment_id: doc.assignment_id,
        suggested_requirement_id: doc.assignment_requirement_id,
        resolved_client_id: doc.client_id,
        resolved_assignment_id: doc.assignment_id,
        resolved_requirement_id: doc.assignment_requirement_id,
        confidence: MatchConfidence.HIGH,
        confidence_score: new Prisma.Decimal(1),
        match_signals: [{ signal: 'uploaded_to_requirement', weight: 1, detail: 'Uploaded directly to this requirement' }],
        public_submission_id: doc.public_submission_id,
        received_at: doc.uploaded_at,
      };
    }

    // Public portal upload: identify the client from the submitter details. Never auto-attach.
    const submission = doc.public_submission;
    const signals: Array<{ signal: string; weight: number; detail: string }> = [];
    let clientId: string | null = null;
    let assignmentId: string | null = null;
    let requirementId: string | null = null;
    let ambiguous = false;
    let score = 0.2;
    if (submission?.submitter_email) {
      const clients = await this.prisma.client.findMany({
        where: {
          organization_id: doc.organization_id,
          deleted_at: null,
          status: ClientStatus.ACTIVE,
          email: { equals: submission.submitter_email, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (clients.length === 1) {
        clientId = clients[0].id;
        score = 0.7;
        signals.push({ signal: 'submitter_email_exact', weight: 0.5, detail: `Email ${submission.submitter_email} matches one client` });
        const fieldKey = (doc.metadata as any)?.field_key;
        const ar = await this.prisma.assignmentRequirement.findFirst({
          where: {
            organization_id: doc.organization_id,
            assignment: { client_id: clientId, form_id: submission.form_id, cancelled_at: null },
            document_requirement: { field_key: fieldKey },
          },
          orderBy: { created_at: 'desc' },
        });
        if (ar) {
          assignmentId = ar.assignment_id;
          requirementId = ar.id;
          score = 0.85;
          signals.push({ signal: 'open_requirement_for_form', weight: 0.15, detail: 'Client has this form assigned' });
        }
      } else if (clients.length > 1) {
        ambiguous = true;
        score = 0.4;
        signals.push({ signal: 'submitter_email_multiple', weight: 0, detail: 'Email matches more than one client' });
      }
    }
    if (!clientId) signals.push({ signal: 'no_client_match', weight: 0, detail: 'No client could be identified' });
    const confidence = score >= 0.9 ? MatchConfidence.HIGH : score >= 0.6 ? MatchConfidence.MEDIUM : MatchConfidence.LOW;
    return {
      source: doc.source,
      processing_status: duplicateOf
        ? InboxProcessingStatus.DUPLICATE
        : clientId
          ? InboxProcessingStatus.NEEDS_REVIEW
          : InboxProcessingStatus.UNMATCHED,
      needs_review: true,
      requires_approval: true,
      is_verified: false,
      is_ambiguous: ambiguous,
      detected_client_id: clientId,
      detected_document_type: doc.title,
      suggested_assignment_id: assignmentId,
      suggested_requirement_id: requirementId,
      confidence,
      confidence_score: new Prisma.Decimal(score),
      match_signals: signals,
      public_submission_id: doc.public_submission_id,
      received_at: doc.uploaded_at,
    };
  }
}

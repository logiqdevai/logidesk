import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AutomationTrigger,
  DocumentVersionChangeType,
  ExpirationSource,
  InboxProcessingStatus,
  InboxReviewAction,
  NotificationType,
  Prisma,
  RequirementStatus,
  ReviewStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { addDays, dateOnly, toIsoDate } from '@/shared/utils/dates/dates.utils';
import { paginate } from '@/shared/utils/pagination/pagination.utils';
import { ProgressService } from '@/modules/assignments/services/progress.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { DOCUMENT_INCLUDE, mapDocument } from '../utils/document.mapper';
import { DocumentQueryType, ReviewDocumentDto, UpdateDocumentDto } from '../dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: ClientAccessService,
    private readonly activity: ActivityService,
    private readonly progress: ProgressService,
    private readonly notifications: NotificationsService,
    private readonly cache: AppCacheService,
  ) {}

  /**
   * Documents page: one row per expected document (requirement) with its current submission,
   * so missing documents are visible next to received ones.
   */
  async list(ws: WorkspaceContext, query: DocumentQueryType) {
    const today = await this.progress.today(ws.organization_id);
    const scope = this.access.viaClient(ws);
    const where: Prisma.AssignmentRequirementWhereInput = {
      organization_id: ws.organization_id,
      assignment: {
        cancelled_at: null,
        client: { deleted_at: null, ...(scope.client ?? {}) },
        ...(query.client_id ? { client_id: query.client_id } : {}),
        ...(query.form_id ? { form_id: query.form_id } : {}),
        ...(query.assignment_id ? { id: query.assignment_id } : {}),
      },
    };
    const and: Prisma.AssignmentRequirementWhereInput[] = [];
    if (query.status) {
      if (query.status === 'EXPIRING_SOON') {
        and.push({
          status: RequirementStatus.APPROVED,
          current_document: { expiration_date: { gte: today, lte: addDays(today, 30) } },
        });
      } else if (query.status === 'UNDER_REVIEW') {
        and.push({ status: { in: [RequirementStatus.UNDER_REVIEW, RequirementStatus.SUBMITTED] } });
      } else {
        and.push({ status: query.status as RequirementStatus });
      }
    }
    if (query.document_type) and.push({ document_requirement: { name: { equals: query.document_type, mode: 'insensitive' } } });
    if (query.source) and.push({ current_document: { source: query.source as any } });
    if (query.file_format) and.push({ current_document: { file_format: query.file_format as any } });
    if (query.expiration === 'expired') and.push({ current_document: { expiration_date: { lt: today } } });
    if (query.expiration === '30d') and.push({ current_document: { expiration_date: { gte: today, lte: addDays(today, 30) } } });
    if (query.expiration === '90d') and.push({ current_document: { expiration_date: { gte: today, lte: addDays(today, 90) } } });
    if (query.expiration === 'none') and.push({ current_document: { expiration_date: null } });
    const since = { '7d': 7, '30d': 30, '90d': 90 }[query.uploaded];
    if (since) and.push({ current_document: { uploaded_at: { gte: new Date(Date.now() - since * 86_400_000) } } });
    if (query.uploaded === 'never') and.push({ current_document_id: null });
    if (query.search) {
      and.push({
        OR: [
          { document_requirement: { name: { contains: query.search, mode: 'insensitive' } } },
          { current_document: { original_filename: { contains: query.search, mode: 'insensitive' } } },
          { assignment: { client: { first_name: { contains: query.search, mode: 'insensitive' } } } },
          { assignment: { client: { last_name: { contains: query.search, mode: 'insensitive' } } } },
          { assignment: { client: { company: { contains: query.search, mode: 'insensitive' } } } },
          { assignment: { form: { name: { contains: query.search, mode: 'insensitive' } } } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const orderBy = (
      query.sort === 'expiration_date'
        ? [{ current_document: { expiration_date: { sort: 'asc', nulls: 'last' } } }]
        : query.sort === 'name'
          ? [{ document_requirement: { name: 'asc' } }]
          : query.sort === 'client'
            ? [{ assignment: { client: { last_name: 'asc' } } }]
            : [{ current_document: { uploaded_at: 'desc' } }, { created_at: 'desc' }]
    ) as Prisma.AssignmentRequirementOrderByWithRelationInput[];

    const [rows, total, types] = await Promise.all([
      this.prisma.assignmentRequirement.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          document_requirement: { select: { name: true, is_required: true, accepted_formats: true, max_files: true } },
          assignment: {
            select: {
              id: true,
              deadline: true,
              form: { select: { id: true, name: true } },
              client: { select: { id: true, first_name: true, last_name: true, company: true } },
            },
          },
          current_document: { include: DOCUMENT_INCLUDE },
        },
      }),
      this.prisma.assignmentRequirement.count({ where }),
      this.prisma.documentRequirement.findMany({
        where: { organization_id: ws.organization_id },
        distinct: ['name'],
        select: { name: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
    ]);
    const soon = addDays(today, 30).getTime();
    const result = paginate(
      rows.map((r) => {
        const exp = r.current_document?.expiration_date;
        return {
          assignment_requirement_id: r.id,
          name: r.document_requirement.name,
          is_required: r.document_requirement.is_required,
          accepted_formats: r.document_requirement.accepted_formats,
          status: r.status,
          expiring_soon: r.status === RequirementStatus.APPROVED && !!exp && exp.getTime() >= today.getTime() && exp.getTime() <= soon,
          deadline: toIsoDate(r.deadline ?? r.assignment.deadline),
          assignment_id: r.assignment.id,
          form: r.assignment.form,
          client: {
            id: r.assignment.client.id,
            name: `${r.assignment.client.first_name} ${r.assignment.client.last_name}`,
            company: r.assignment.client.company,
          },
          document: r.current_document ? mapDocument(r.current_document) : null,
        };
      }),
      total,
      query.page,
      query.limit,
    );
    return { ...result, document_types: types.map((t) => t.name) };
  }

  /** Loads a document and enforces client-level access (unidentified items: Owners/Admins only). */
  async assertDocument(ws: WorkspaceContext, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, organization_id: ws.organization_id, deleted_at: null },
      include: DOCUMENT_INCLUDE,
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.client_id) await this.access.assertClient(ws, doc.client_id);
    else if (!ws.permissions.includes(Permission.INBOX_VIEW_UNIDENTIFIED)) throw new ForbiddenException('Not allowed');
    return doc;
  }

  async get(ws: WorkspaceContext, documentId: string) {
    const doc = await this.assertDocument(ws, documentId);
    const [versions, requirement] = await Promise.all([
      this.prisma.documentVersion.findMany({
        where: { document_id: doc.id },
        orderBy: { version_number: 'desc' },
        include: {
          changed_by_user: { select: { first_name: true, last_name: true } },
          changed_by_client_user: { select: { email: true } },
        },
      }),
      doc.assignment_requirement_id
        ? this.prisma.assignmentRequirement.findUnique({
            where: { id: doc.assignment_requirement_id },
            include: {
              document_requirement: { select: { name: true, requires_approval: true, expiration_policy: true } },
              assignment: { select: { id: true, form: { select: { id: true, name: true } } } },
            },
          })
        : null,
    ]);
    const client = doc.client_id
      ? await this.prisma.client.findUnique({ where: { id: doc.client_id }, select: { id: true, first_name: true, last_name: true, company: true } })
      : null;
    return {
      ...mapDocument(doc),
      client: client ? { id: client.id, name: `${client.first_name} ${client.last_name}`, company: client.company } : null,
      requirement: requirement
        ? {
            id: requirement.id,
            name: requirement.document_requirement.name,
            status: requirement.status,
            requires_approval: requirement.document_requirement.requires_approval,
            assignment_id: requirement.assignment.id,
            form: requirement.assignment.form,
          }
        : null,
      versions: versions.map((v) => ({
        id: v.id,
        version_number: v.version_number,
        change_type: v.change_type,
        change_reason: v.change_reason,
        expiration_date: toIsoDate(v.expiration_date),
        review_status: v.review_status,
        created_at: v.created_at,
        changed_by: v.changed_by_user
          ? `${v.changed_by_user.first_name ?? ''} ${v.changed_by_user.last_name ?? ''}`.trim()
          : (v.changed_by_client_user?.email ?? 'System'),
      })),
    };
  }

  async signedUrl(ws: WorkspaceContext, documentId: string, disposition: 'inline' | 'attachment' = 'attachment') {
    const doc = await this.assertDocument(ws, documentId);
    return this.urlFor(doc, disposition);
  }

  async urlFor(doc: { storage_key: string; original_filename: string; mime_type: string }, disposition: 'inline' | 'attachment') {
    const url = await this.storage.signedUrl(doc.storage_key, {
      disposition,
      filename: doc.original_filename,
      contentType: doc.mime_type,
      expiresInSeconds: 300,
    });
    return { url, expires_in: 300 };
  }

  private async nextVersion(tx: Prisma.TransactionClient, documentId: string) {
    const last = await tx.documentVersion.findFirst({ where: { document_id: documentId }, orderBy: { version_number: 'desc' } });
    return (last?.version_number ?? 0) + 1;
  }

  async update(ws: WorkspaceContext, documentId: string, dto: UpdateDocumentDto) {
    const doc = await this.assertDocument(ws, documentId);
    const expirationChanged =
      dto.expiration_date !== undefined && (dto.expiration_date ?? null) !== toIsoDate(doc.expiration_date);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: doc.id },
        data: {
          title: dto.title ?? undefined,
          notes: dto.notes ?? undefined,
          ...(expirationChanged
            ? {
                expiration_date: dateOnly(dto.expiration_date),
                expiration_source: dto.expiration_date ? ExpirationSource.MANUAL : null,
                expiration_verified_at: dto.expiration_date ? new Date() : null,
              }
            : {}),
        },
      });
      await tx.documentVersion.create({
        data: {
          organization_id: ws.organization_id,
          document_id: doc.id,
          version_number: await this.nextVersion(tx, doc.id),
          change_type: expirationChanged ? DocumentVersionChangeType.EXPIRATION_CHANGED : DocumentVersionChangeType.METADATA_UPDATED,
          original_filename: updated.original_filename,
          storage_key: updated.storage_key,
          mime_type: updated.mime_type,
          size_bytes: updated.size_bytes,
          expiration_date: updated.expiration_date,
          review_status: updated.review_status,
          snapshot: { title: updated.title, notes: updated.notes } as Prisma.InputJsonValue,
          changed_by_user_id: ws.user_id,
        },
      });
      await this.activity.log(
        {
          organizationId: ws.organization_id,
          action: expirationChanged ? 'document.expiration_changed' : 'document.updated',
          entityType: 'document',
          entityId: doc.id,
          documentId: doc.id,
          clientId: doc.client_id,
          assignmentId: doc.assignment_id,
          actorUserId: ws.user_id,
          description: expirationChanged
            ? `Expiration of ${doc.title} changed from ${toIsoDate(doc.expiration_date) ?? 'none'} to ${dto.expiration_date ?? 'none'}`
            : `Updated details of ${doc.title}`,
        },
        tx,
      );
      if (doc.assignment_id) await this.progress.recalcAssignment(doc.assignment_id, tx);
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    return this.get(ws, doc.id);
  }

  /**
   * Approve or reject a submission (all files of the same submission share the decision).
   * Resolves the matching inbox items, recalculates progress, audits and notifies the client.
   */
  async review(ws: WorkspaceContext, documentId: string, dto: ReviewDocumentDto, via: 'documents' | 'inbox' = 'documents') {
    const doc = await this.assertDocument(ws, documentId);
    if (!doc.assignment_requirement_id) {
      throw new BadRequestException('Link this document to a client requirement before reviewing it');
    }
    if (doc.superseded_at) throw new BadRequestException('This submission has been replaced by a newer one');
    const decision = dto.decision === 'APPROVED' ? ReviewStatus.APPROVED : ReviewStatus.REJECTED;
    const submissionId = (doc.metadata as any)?.submission_id;
    const group = await this.prisma.document.findMany({
      where: {
        assignment_requirement_id: doc.assignment_requirement_id,
        superseded_at: null,
        deleted_at: null,
        ...(submissionId ? { metadata: { path: ['submission_id'], equals: submissionId } } : { id: doc.id }),
      },
    });
    const ids = group.length ? group.map((d) => d.id) : [doc.id];

    await this.prisma.$transaction(async (tx) => {
      for (const id of ids) {
        const updated = await tx.document.update({
          where: { id },
          data: {
            review_status: decision,
            reviewed_by_user_id: ws.user_id,
            reviewed_at: new Date(),
            rejection_reason: decision === ReviewStatus.REJECTED ? dto.reason : null,
            is_verified: true,
          },
        });
        await tx.documentVersion.create({
          data: {
            organization_id: ws.organization_id,
            document_id: id,
            version_number: await this.nextVersion(tx, id),
            change_type: DocumentVersionChangeType.REVIEW_CHANGED,
            original_filename: updated.original_filename,
            storage_key: updated.storage_key,
            mime_type: updated.mime_type,
            size_bytes: updated.size_bytes,
            expiration_date: updated.expiration_date,
            review_status: decision,
            change_reason: dto.reason ?? null,
            changed_by_user_id: ws.user_id,
          },
        });
      }
      await tx.documentInboxItem.updateMany({
        where: { organization_id: ws.organization_id, document_id: { in: ids }, needs_review: true },
        data: {
          needs_review: false,
          processing_status: InboxProcessingStatus.RESOLVED,
          review_action: decision === ReviewStatus.APPROVED ? InboxReviewAction.APPROVED : InboxReviewAction.REJECTED,
          reviewed_by_user_id: ws.user_id,
          reviewed_at: new Date(),
          review_note: dto.reason ?? null,
        },
      });
      await this.activity.log(
        {
          organizationId: ws.organization_id,
          action: decision === ReviewStatus.APPROVED ? 'document.approved' : 'document.rejected',
          entityType: 'document',
          entityId: doc.id,
          documentId: doc.id,
          clientId: doc.client_id,
          assignmentId: doc.assignment_id,
          actorUserId: ws.user_id,
          description: `${decision === ReviewStatus.APPROVED ? 'Approved' : 'Rejected'} ${doc.title}${dto.reason ? ` — ${dto.reason}` : ''}`,
          metadata: { via, document_ids: ids },
        },
        tx,
      );
      if (doc.assignment_id) await this.progress.recalcAssignment(doc.assignment_id, tx);
    });

    await this.notifyReview(ws, doc, decision, dto.reason).catch(() => undefined);
    await this.cache.invalidateOrganization(ws.organization_id);
    return this.get(ws, doc.id);
  }

  private async notifyReview(ws: WorkspaceContext, doc: { id: string; title: string; client_id: string | null; assignment_id: string | null }, decision: ReviewStatus, reason?: string) {
    // Only rejections are emailed; approvals are visible to the client in the portal.
    if (!doc.client_id || decision === ReviewStatus.APPROVED) return;
    const trigger = AutomationTrigger.DOCUMENT_REJECTED;
    const rule = await this.prisma.automationRule.findFirst({ where: { organization_id: ws.organization_id, trigger, form_id: null } });
    if (rule && !rule.enabled) return;
    const client = await this.prisma.client.findUnique({ where: { id: doc.client_id } });
    if (!client?.email) return;
    const [clientUser, assignment] = await Promise.all([
      this.prisma.clientUser.findFirst({ where: { client_id: client.id, status: 'ACTIVE' } }),
      doc.assignment_id
        ? this.prisma.formAssignment.findUnique({ where: { id: doc.assignment_id }, select: { form: { select: { name: true } } } })
        : null,
    ]);
    await this.notifications.notify({
      organizationId: ws.organization_id,
      type: NotificationType.DOCUMENT_REJECTED,
      recipientAddress: client.email,
      recipientName: `${client.first_name} ${client.last_name}`,
      clientId: client.id,
      clientUserId: clientUser?.id,
      assignmentId: doc.assignment_id,
      automationRuleId: rule?.id,
      sentByUserId: ws.user_id,
      respectQuietHours: true,
      variables: {
        client_name: client.first_name,
        document_name: doc.title,
        form_name: assignment?.form.name ?? '',
        rejection_reason: reason ?? '',
        portal_link: this.notifications.portalUrl(),
      },
      idempotencyKey: `review:${doc.id}:${decision}:${Date.now()}`,
    });
  }

  /**
   * Soft-deletes a submission. When it was the requirement's current submission, the previous
   * one (if any) becomes current again; otherwise the requirement goes back to Missing.
   */
  async remove(ws: WorkspaceContext, documentId: string) {
    const doc = await this.assertDocument(ws, documentId);
    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({ where: { id: doc.id }, data: { deleted_at: new Date() } });
      await tx.documentInboxItem.updateMany({
        where: { document_id: doc.id, needs_review: true },
        data: { needs_review: false, processing_status: InboxProcessingStatus.RESOLVED, review_action: InboxReviewAction.DISMISSED, reviewed_by_user_id: ws.user_id, reviewed_at: new Date(), review_note: 'Document deleted' },
      });
      if (doc.assignment_requirement_id) {
        const ar = await tx.assignmentRequirement.findUnique({ where: { id: doc.assignment_requirement_id } });
        if (ar?.current_document_id === doc.id) {
          const siblings = await tx.document.findFirst({
            where: { assignment_requirement_id: ar.id, superseded_at: null, deleted_at: null },
            orderBy: { uploaded_at: 'desc' },
          });
          let next = siblings;
          if (!next) {
            next = await tx.document.findFirst({
              where: { assignment_requirement_id: ar.id, deleted_at: null, superseded_at: { not: null } },
              orderBy: { uploaded_at: 'desc' },
            });
            if (next) {
              await tx.document.update({ where: { id: next.id }, data: { superseded_at: null, superseded_by_id: null } });
            }
          }
          await tx.assignmentRequirement.update({ where: { id: ar.id }, data: { current_document_id: next?.id ?? null } });
        }
      }
      await this.activity.log(
        {
          organizationId: ws.organization_id,
          action: 'document.deleted',
          entityType: 'document',
          entityId: doc.id,
          documentId: doc.id,
          clientId: doc.client_id,
          assignmentId: doc.assignment_id,
          actorUserId: ws.user_id,
          description: `Deleted ${doc.title} (${doc.original_filename})`,
        },
        tx,
      );
      if (doc.assignment_id) await this.progress.recalcAssignment(doc.assignment_id, tx);
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    return { success: true };
  }
}

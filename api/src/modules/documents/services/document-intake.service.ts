import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DocumentVersionChangeType,
  ExpirationSource,
  JobQueue,
  JobTrigger,
  Prisma,
  RequirementStatus,
  ReviewStatus,
  UploadSource,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { JobsService } from '@/core/jobs/jobs.service';
import { JobNames } from '@/core/queues/queues.constants';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { dateOnly } from '@/shared/utils/dates/dates.utils';
import { UploadedFile, validateUpload } from '../utils/file-validation.utils';

export interface IntakeActor {
  userId?: string | null;
  clientUserId?: string | null;
}

export interface SubmitToRequirementInput {
  organizationId: string;
  assignmentRequirementId: string;
  files: UploadedFile[];
  source: UploadSource;
  actor: IntakeActor;
  expirationDate?: string | null;
  notes?: string | null;
  /** Portal uploads honour "allow multiple submissions"; employees may always replace. */
  enforceSubmissionRules?: boolean;
  ip?: string;
}

/**
 * Stores uploaded files and creates the document records synchronously (validation + storage),
 * then hands everything else to the DOCUMENT_PROCESSING queue (checksum, duplicates, expiration,
 * inbox item, progress, notifications).
 */
@Injectable()
export class DocumentIntakeService {
  private readonly logger = new Logger(DocumentIntakeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
    private readonly activity: ActivityService,
    private readonly cache: AppCacheService,
  ) {}

  async assertStorageQuota(organizationId: string, incomingBytes: number) {
    const [org, used] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { storage_limit_bytes: true } }),
      this.prisma.document.aggregate({ where: { organization_id: organizationId, deleted_at: null }, _sum: { size_bytes: true } }),
    ]);
    const usedBytes = BigInt(used._sum.size_bytes ?? 0);
    if (org && usedBytes + BigInt(incomingBytes) > org.storage_limit_bytes) {
      throw new BadRequestException('Your workspace has reached its storage allowance');
    }
  }

  async submitToRequirement(input: SubmitToRequirementInput) {
    if (!input.files?.length) throw new BadRequestException('Choose at least one file to upload');
    const ar = await this.prisma.assignmentRequirement.findFirst({
      where: { id: input.assignmentRequirementId, organization_id: input.organizationId },
      include: {
        document_requirement: true,
        assignment: { select: { id: true, client_id: true, cancelled_at: true, form: { select: { name: true } } } },
      },
    });
    if (!ar) throw new NotFoundException('Document requirement not found');
    if (ar.assignment.cancelled_at) throw new BadRequestException('This assignment was cancelled');
    const req = ar.document_requirement;

    if (input.files.length > req.max_files) {
      throw new BadRequestException(`You can upload at most ${req.max_files} file${req.max_files === 1 ? '' : 's'} for "${req.name}"`);
    }
    if (input.enforceSubmissionRules) {
      if (ar.status === RequirementStatus.NOT_REQUIRED) throw new BadRequestException(`"${req.name}" is no longer required`);
      const replaceable: RequirementStatus[] = [RequirementStatus.MISSING, RequirementStatus.REJECTED, RequirementStatus.EXPIRED];
      if (!req.allow_multiple_submissions && !replaceable.includes(ar.status)) {
        throw new BadRequestException(`"${req.name}" has already been submitted`);
      }
    }
    const validated = input.files.map((file) =>
      validateUpload(file, { accepted: req.accepted_formats, maxSizeMb: req.max_file_size_mb }),
    );
    const totalBytes = input.files.reduce((sum, f) => sum + f.size, 0);
    await this.assertStorageQuota(input.organizationId, totalBytes);

    const submissionId = randomUUID();
    const stored: string[] = [];
    try {
      for (const file of input.files) {
        const key = this.storage.buildKey(input.organizationId, `clients/${ar.assignment.client_id}/${ar.assignment.id}`, file.originalname);
        await this.storage.put(key, file.buffer, validated[stored.length].mime);
        stored.push(key);
      }

      const documents = await this.prisma.$transaction(async (tx) => {
        const previous = await tx.document.findMany({
          where: { assignment_requirement_id: ar.id, superseded_at: null, deleted_at: null },
          orderBy: { uploaded_at: 'desc' },
        });
        const created = [];
        for (let i = 0; i < input.files.length; i++) {
          const file = input.files[i];
          const doc = await tx.document.create({
            data: {
              organization_id: input.organizationId,
              client_id: ar.assignment.client_id,
              assignment_id: ar.assignment.id,
              assignment_requirement_id: ar.id,
              document_requirement_id: req.id,
              title: req.name,
              original_filename: file.originalname.slice(0, 255),
              storage_key: stored[i],
              storage_bucket: this.storage.bucket,
              mime_type: validated[i].mime,
              file_format: validated[i].format,
              size_bytes: file.size,
              source: input.source,
              uploaded_by_user_id: input.actor.userId ?? null,
              uploaded_by_client_user_id: input.actor.clientUserId ?? null,
              expiration_date: dateOnly(input.expirationDate ?? null),
              expiration_source: input.expirationDate ? ExpirationSource.MANUAL : null,
              review_status: ReviewStatus.PENDING,
              notes: input.notes ?? null,
              metadata: { submission_id: submissionId, processed: false } as Prisma.InputJsonValue,
            },
          });
          await tx.documentVersion.create({
            data: {
              organization_id: input.organizationId,
              document_id: doc.id,
              version_number: 1,
              change_type: DocumentVersionChangeType.CREATED,
              original_filename: doc.original_filename,
              storage_key: doc.storage_key,
              mime_type: doc.mime_type,
              size_bytes: doc.size_bytes,
              expiration_date: doc.expiration_date,
              review_status: doc.review_status,
              changed_by_user_id: input.actor.userId ?? null,
              changed_by_client_user_id: input.actor.clientUserId ?? null,
            },
          });
          created.push(doc);
        }
        // Replacing adds a new submission and preserves the earlier ones.
        for (let i = 0; i < previous.length; i++) {
          await tx.document.update({
            where: { id: previous[i].id },
            data: { superseded_at: new Date(), superseded_by_id: i === 0 ? created[0].id : null },
          });
        }
        await tx.assignmentRequirement.update({
          where: { id: ar.id },
          data: { current_document_id: created[0].id, status: RequirementStatus.SUBMITTED },
        });
        await tx.formAssignment.update({ where: { id: ar.assignment.id }, data: { last_submission_at: new Date() } });
        await this.activity.log(
          {
            organizationId: input.organizationId,
            action: previous.length ? 'document.replaced' : 'document.uploaded',
            entityType: 'document',
            entityId: created[0].id,
            documentId: created[0].id,
            clientId: ar.assignment.client_id,
            assignmentId: ar.assignment.id,
            actorUserId: input.actor.userId,
            actorClientUserId: input.actor.clientUserId,
            description: `${previous.length ? 'Replaced' : 'Uploaded'} ${req.name} (${created.map((d) => d.original_filename).join(', ')})${
              input.source === UploadSource.EMPLOYEE_UPLOAD ? ' on behalf of the client' : ''
            }`,
            metadata: { source: input.source, files: created.length, replaced: previous.map((p) => p.id) },
            ipAddress: input.ip,
          },
          tx,
        );
        return created;
      });

      for (const doc of documents) await this.enqueueProcessing(input.organizationId, doc.id, input.actor.userId ?? undefined);
      await this.cache.invalidateOrganization(input.organizationId);
      return documents;
    } catch (error) {
      await Promise.all(stored.map((key) => this.storage.delete(key).catch(() => undefined)));
      throw error;
    }
  }

  async enqueueProcessing(organizationId: string, documentId: string, userId?: string, trigger: JobTrigger = JobTrigger.API_REQUEST) {
    await this.jobs.enqueue({
      queue: JobQueue.DOCUMENT_PROCESSING,
      name: JobNames.DOCUMENT_PROCESS,
      jobId: `document-process-${documentId}`,
      data: { document_id: documentId },
      organizationId,
      trigger,
      triggeredByUserId: userId,
      entityType: 'document',
      entityId: documentId,
      attempts: 5,
      backoffMs: 10_000,
    });
  }
}

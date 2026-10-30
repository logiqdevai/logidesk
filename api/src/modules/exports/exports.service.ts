import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JobQueue, JobRunStatus, JobTrigger } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { JobsService } from '@/core/jobs/jobs.service';
import { JobNames } from '@/core/queues/queues.constants';
import { StorageService } from '@/core/storage/storage.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { SubmissionsQueryType } from '@/modules/forms/dto/form.dto';

/**
 * File Space .zip archives and CSV exports. The request only enqueues an EXPORTS job and
 * returns its id; the page polls the status and receives a short-lived signed URL when ready.
 */
@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly storage: StorageService,
    private readonly access: ClientAccessService,
  ) {}

  private actor(ws: WorkspaceContext) {
    return { organization_id: ws.organization_id, user_id: ws.user_id, member_id: ws.member_id, role: ws.role };
  }

  async requestZip(ws: WorkspaceContext, input: { client_id?: string; assignment_id?: string }) {
    if (input.client_id) await this.access.assertClient(ws, input.client_id);
    if (input.assignment_id) await this.access.assertAssignment(ws, input.assignment_id);
    const run = await this.jobs.enqueue({
      queue: JobQueue.EXPORTS,
      name: JobNames.EXPORT_ZIP,
      jobId: `export-zip-${randomUUID()}`,
      data: { ...this.actor(ws), client_id: input.client_id ?? null, assignment_id: input.assignment_id ?? null },
      organizationId: ws.organization_id,
      trigger: JobTrigger.API_REQUEST,
      triggeredByUserId: ws.user_id,
      entityType: input.assignment_id ? 'form_assignment' : input.client_id ? 'client' : 'organization',
      entityId: input.assignment_id ?? input.client_id ?? ws.organization_id,
      attempts: 2,
      backoffMs: 15_000,
    });
    return { export_id: run.job_id, status: run.status };
  }

  async requestSubmissionsCsv(ws: WorkspaceContext, formId: string, query: SubmissionsQueryType) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organization_id: ws.organization_id } });
    if (!form) throw new NotFoundException('Form not found');
    const run = await this.jobs.enqueue({
      queue: JobQueue.EXPORTS,
      name: JobNames.EXPORT_CSV,
      jobId: `export-csv-${randomUUID()}`,
      data: { ...this.actor(ws), form_id: formId, filters: query as Record<string, unknown> },
      organizationId: ws.organization_id,
      trigger: JobTrigger.API_REQUEST,
      triggeredByUserId: ws.user_id,
      entityType: 'form',
      entityId: formId,
      attempts: 2,
      backoffMs: 5_000,
    });
    return { export_id: run.job_id, status: run.status };
  }

  async status(ws: WorkspaceContext, exportId: string) {
    const run = await this.prisma.jobRun.findFirst({
      where: { queue: JobQueue.EXPORTS, job_id: exportId, organization_id: ws.organization_id },
      orderBy: { attempt: 'desc' },
    });
    if (!run) throw new NotFoundException('Export not found');
    if (run.triggered_by_user_id !== ws.user_id && !this.access.canSeeAll(ws)) throw new ForbiddenException('Not allowed');
    const result = (run.result ?? {}) as Record<string, any>;
    let url: string | null = null;
    if (run.status === JobRunStatus.COMPLETED && result.storage_key && !result.purged) {
      url = await this.storage.signedUrl(result.storage_key, {
        disposition: 'attachment',
        filename: result.filename,
        contentType: result.content_type,
        expiresInSeconds: 600,
      });
    }
    return {
      export_id: run.job_id,
      status: run.status,
      progress: run.progress ?? (run.status === JobRunStatus.COMPLETED ? 100 : 0),
      attempt: run.attempt,
      error: run.status === JobRunStatus.FAILED ? run.error_message : null,
      filename: result.filename ?? null,
      file_count: result.file_count ?? null,
      size_bytes: result.size_bytes ?? null,
      url,
      expires_at: result.expires_at ?? null,
    };
  }
}

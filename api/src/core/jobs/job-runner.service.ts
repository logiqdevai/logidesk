import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { hostname } from 'os';
import { JobQueue, JobRunStatus, JobTrigger, Prisma } from 'generated/prisma';
import { PrismaService } from '../databases/prisma/prisma.service';
import { JobRunContext } from './interfaces/jobs.interface';
import { sanitizePayload } from './jobs.service';

const WORKER_HOST = hostname();
const WORKER_ID = `${WORKER_HOST}:${process.pid}`;

/**
 * Wraps every processor so each attempt is mirrored in `job_runs`: the attempt row moves to
 * ACTIVE with the worker ("station"), then COMPLETED or RETRYING/FAILED. A retry creates a new
 * row for the next attempt; earlier attempts are never overwritten.
 */
@Injectable()
export class JobRunnerService {
  private readonly logger = new Logger(JobRunnerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run<T>(queue: JobQueue, job: Job, handler: (ctx: JobRunContext) => Promise<T>): Promise<T> {
    const attempt = job.attemptsMade + 1;
    const jobId = String(job.id);
    const startedAt = new Date();
    const first = await this.prisma.jobRun.findFirst({
      where: { queue, job_id: jobId },
      orderBy: { attempt: 'asc' },
    });

    const run = await this.prisma.jobRun.upsert({
      where: { queue_job_id_attempt: { queue, job_id: jobId, attempt } },
      create: {
        queue,
        job_name: job.name,
        job_id: jobId,
        attempt,
        max_attempts: job.opts.attempts ?? 1,
        status: JobRunStatus.ACTIVE,
        trigger: first?.trigger ?? (job.repeatJobKey ? JobTrigger.SCHEDULER : JobTrigger.SYSTEM),
        organization_id: first?.organization_id ?? null,
        payload: (first?.payload ?? sanitizePayload(job.data)) as Prisma.InputJsonValue,
        entity_type: first?.entity_type ?? null,
        entity_id: first?.entity_id ?? null,
        parent_job_run_id: first?.parent_job_run_id ?? null,
        triggered_by_user_id: first?.triggered_by_user_id ?? null,
        queued_at: new Date(job.timestamp),
        started_at: startedAt,
        wait_ms: Math.max(0, startedAt.getTime() - (job.processedOn ?? job.timestamp)),
        worker_id: WORKER_ID,
        worker_host: WORKER_HOST,
        worker_pid: process.pid,
      },
      update: {
        status: JobRunStatus.ACTIVE,
        started_at: startedAt,
        worker_id: WORKER_ID,
        worker_host: WORKER_HOST,
        worker_pid: process.pid,
      },
    });
    const waitMs = Math.max(0, startedAt.getTime() - run.queued_at.getTime());
    if (run.wait_ms === null) {
      await this.prisma.jobRun.update({ where: { id: run.id }, data: { wait_ms: waitMs } });
    }

    const logs: Array<Record<string, unknown>> = [];
    const ctx: JobRunContext = {
      jobRunId: run.id,
      attempt,
      log: (message, data) => logs.push({ at: new Date().toISOString(), message, ...(data ?? {}) }),
      progress: async (percent) => {
        await job.updateProgress(percent);
        await this.prisma.jobRun.update({ where: { id: run.id }, data: { progress: percent } });
      },
    };

    try {
      const result = await handler(ctx);
      const finishedAt = new Date();
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: JobRunStatus.COMPLETED,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          result: (sanitizePayload(result) ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          progress: 100,
          logs: logs as Prisma.InputJsonValue,
        },
      });
      return result;
    } catch (error) {
      const finishedAt = new Date();
      const maxAttempts = job.opts.attempts ?? 1;
      const willRetry = attempt < maxAttempts && !(error as any)?.unrecoverable;
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: willRetry ? JobRunStatus.RETRYING : JobRunStatus.FAILED,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          error_message: String(error?.message ?? error).slice(0, 2000),
          error_stack: String(error?.stack ?? '').slice(0, 8000),
          logs: logs as Prisma.InputJsonValue,
        },
      });
      if (willRetry) {
        const backoff = job.opts.backoff;
        const base = typeof backoff === 'object' ? (backoff.delay ?? 0) : (backoff ?? 0);
        const delay = base * Math.pow(2, attempt - 1);
        await this.prisma.jobRun
          .create({
            data: {
              queue,
              job_name: job.name,
              job_id: jobId,
              attempt: attempt + 1,
              max_attempts: maxAttempts,
              status: JobRunStatus.DELAYED,
              trigger: run.trigger,
              organization_id: run.organization_id,
              payload: run.payload ?? Prisma.JsonNull,
              entity_type: run.entity_type,
              entity_id: run.entity_id,
              parent_job_run_id: run.parent_job_run_id,
              triggered_by_user_id: run.triggered_by_user_id,
              scheduled_for: new Date(Date.now() + delay),
            },
          })
          .catch(() => undefined);
      }
      this.logger.warn(`${job.name} (${jobId}) attempt ${attempt}/${maxAttempts} failed: ${error?.message}`);
      throw error;
    }
  }

  async markStalled(queue: JobQueue, jobId: string) {
    await this.prisma.jobRun.updateMany({
      where: { queue, job_id: jobId, status: JobRunStatus.ACTIVE },
      data: { status: JobRunStatus.STALLED },
    });
  }
}

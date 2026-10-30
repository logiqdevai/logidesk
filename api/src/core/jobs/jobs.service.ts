import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobQueue, JobRun, JobRunStatus, JobTrigger, Prisma } from 'generated/prisma';
import { PrismaService } from '../databases/prisma/prisma.service';
import { EnqueueJobOptions } from './interfaces/jobs.interface';

/** Keys that must never be persisted in job_runs payloads. */
const SENSITIVE_KEYS = /pass(word)?|secret|token|authorization|body|content|html|text|buffer/i;

/**
 * Single entry point for putting work on a queue. Writes the durable `job_runs` row first and
 * then adds the BullMQ job using a deterministic job id (the idempotency key), so the same
 * piece of work can never be queued twice.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly queues: Record<JobQueue, Queue>;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(JobQueue.NOTIFICATIONS) notifications: Queue,
    @InjectQueue(JobQueue.REMINDERS) reminders: Queue,
    @InjectQueue(JobQueue.EXPIRATION) expiration: Queue,
    @InjectQueue(JobQueue.EMAIL_SYNC) emailSync: Queue,
    @InjectQueue(JobQueue.EMAIL_PROCESSING) emailProcessing: Queue,
    @InjectQueue(JobQueue.DOCUMENT_PROCESSING) documentProcessing: Queue,
    @InjectQueue(JobQueue.EXPORTS) exports: Queue,
    @InjectQueue(JobQueue.MAINTENANCE) maintenance: Queue,
  ) {
    this.queues = {
      NOTIFICATIONS: notifications,
      REMINDERS: reminders,
      EXPIRATION: expiration,
      EMAIL_SYNC: emailSync,
      EMAIL_PROCESSING: emailProcessing,
      DOCUMENT_PROCESSING: documentProcessing,
      EXPORTS: exports,
      MAINTENANCE: maintenance,
    };
  }

  getQueue(queue: JobQueue): Queue {
    return this.queues[queue];
  }

  /** BullMQ job ids must not contain ':' — normalize idempotency keys. */
  static jobId(key: string): string {
    return key.replace(/[:\s/]/g, '_');
  }

  async enqueue(options: EnqueueJobOptions): Promise<JobRun> {
    const jobId = JobsService.jobId(options.jobId);
    const attempts = options.attempts ?? 3;
    const delay = Math.max(0, options.delayMs ?? 0);
    const scheduledFor = delay > 0 ? new Date(Date.now() + delay) : null;

    let run: JobRun;
    try {
      run = await this.prisma.jobRun.create({
        data: {
          organization_id: options.organizationId ?? null,
          queue: options.queue,
          job_name: options.name,
          job_id: jobId,
          status: delay > 0 ? JobRunStatus.DELAYED : JobRunStatus.QUEUED,
          trigger: options.trigger ?? JobTrigger.SYSTEM,
          attempt: 1,
          max_attempts: attempts,
          priority: options.priority ?? null,
          payload: sanitizePayload(options.data) as Prisma.InputJsonValue,
          entity_type: options.entityType ?? null,
          entity_id: options.entityId ?? null,
          parent_job_run_id: options.parentJobRunId ?? null,
          triggered_by_user_id: options.triggeredByUserId ?? null,
          scheduled_for: scheduledFor,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Same idempotency key already queued: never enqueue twice.
        return this.prisma.jobRun.findFirst({
          where: { queue: options.queue, job_id: jobId },
          orderBy: { attempt: 'desc' },
        });
      }
      throw error;
    }

    try {
      await this.queues[options.queue].add(options.name, options.data ?? {}, {
        jobId,
        delay,
        attempts,
        priority: options.priority,
        backoff: { type: 'exponential', delay: options.backoffMs ?? 30_000 },
        removeOnComplete: { count: 2000 },
        removeOnFail: { count: 5000 },
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue ${options.name} (${jobId}): ${error.message}`);
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: JobRunStatus.FAILED,
          error_message: `Queue unavailable: ${error.message}`,
          finished_at: new Date(),
        },
      });
      throw new ServiceUnavailableException('Background queue is unavailable, please retry');
    }

    return run;
  }
}

export function sanitizePayload(data: unknown): unknown {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(sanitizePayload);
  if (typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEYS.test(key))
        .map(([key, value]) => [key, sanitizePayload(value)]),
    );
  }
  return data;
}

import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { JobQueue } from 'generated/prisma';
import { JobRunnerService } from '@/core/jobs/job-runner.service';
import { JobNames, QueueConcurrency } from '@/core/queues/queues.constants';
import { NotificationDeliveryService } from '@/modules/notifications/services/notification-delivery.service';
import { AuthEmailService } from '@/modules/auth/services/auth-email.service';
import { RemindersService } from '@/modules/notifications/services/reminders.service';
import { DocumentProcessingService } from '@/modules/documents/services/document-processing.service';
import { ExportBuilderService } from '@/modules/exports/export-builder.service';
import { ExpirationService } from '../services/expiration.service';
import { MaintenanceService } from '../services/maintenance.service';

abstract class BaseProcessor extends WorkerHost {
  protected abstract readonly queue: JobQueue;
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly runner: JobRunnerService) {
    super();
  }

  @OnWorkerEvent('stalled')
  async onStalled(jobId: string) {
    await this.runner.markStalled(this.queue, jobId).catch(() => undefined);
  }
}

function unknownJob(job: Job): never {
  throw new UnrecoverableError(`Unknown job ${job.name}`);
}

@Processor(JobQueue.NOTIFICATIONS, { concurrency: QueueConcurrency.NOTIFICATIONS })
export class NotificationsProcessor extends BaseProcessor {
  protected readonly queue = JobQueue.NOTIFICATIONS;

  constructor(
    runner: JobRunnerService,
    private readonly delivery: NotificationDeliveryService,
    private readonly authEmails: AuthEmailService,
  ) {
    super(runner);
  }

  process(job: Job) {
    return this.runner.run(this.queue, job, async (): Promise<unknown> => {
      if (job.name === JobNames.NOTIFICATION_DELIVER) {
        return this.delivery.deliver(job.data.notification_id, job.attemptsMade + 1, job.opts.attempts ?? 1);
      }
      if (job.name === JobNames.AUTH_EMAIL) return this.authEmails.send(job.data.user_id, job.data.kind);
      return unknownJob(job);
    });
  }
}

@Processor(JobQueue.REMINDERS, { concurrency: QueueConcurrency.REMINDERS })
export class RemindersProcessor extends BaseProcessor {
  protected readonly queue = JobQueue.REMINDERS;

  constructor(
    runner: JobRunnerService,
    private readonly reminders: RemindersService,
  ) {
    super(runner);
  }

  process(job: Job) {
    return this.runner.run(this.queue, job, (ctx) =>
      job.name === JobNames.REMINDERS_SCAN ? this.reminders.scan(ctx) : unknownJob(job),
    );
  }
}

@Processor(JobQueue.EXPIRATION, { concurrency: QueueConcurrency.EXPIRATION })
export class ExpirationProcessor extends BaseProcessor {
  protected readonly queue = JobQueue.EXPIRATION;

  constructor(
    runner: JobRunnerService,
    private readonly expiration: ExpirationService,
  ) {
    super(runner);
  }

  process(job: Job) {
    return this.runner.run(this.queue, job, (ctx) =>
      job.name === JobNames.EXPIRATION_SWEEP ? this.expiration.sweep(ctx) : unknownJob(job),
    );
  }
}

@Processor(JobQueue.DOCUMENT_PROCESSING, { concurrency: QueueConcurrency.DOCUMENT_PROCESSING })
export class DocumentProcessingProcessor extends BaseProcessor {
  protected readonly queue = JobQueue.DOCUMENT_PROCESSING;

  constructor(
    runner: JobRunnerService,
    private readonly processing: DocumentProcessingService,
  ) {
    super(runner);
  }

  process(job: Job) {
    return this.runner.run(this.queue, job, (ctx) =>
      job.name === JobNames.DOCUMENT_PROCESS ? this.processing.process(job.data.document_id, ctx) : unknownJob(job),
    );
  }
}

@Processor(JobQueue.EXPORTS, { concurrency: QueueConcurrency.EXPORTS })
export class ExportsProcessor extends BaseProcessor {
  protected readonly queue = JobQueue.EXPORTS;

  constructor(
    runner: JobRunnerService,
    private readonly builder: ExportBuilderService,
  ) {
    super(runner);
  }

  process(job: Job) {
    return this.runner.run(this.queue, job, (ctx): Promise<unknown> => {
      if (job.name === JobNames.EXPORT_ZIP) return this.builder.buildZip(job.data, ctx);
      if (job.name === JobNames.EXPORT_CSV) return this.builder.buildSubmissionsCsv(job.data, ctx);
      return unknownJob(job);
    });
  }
}

@Processor(JobQueue.MAINTENANCE, { concurrency: QueueConcurrency.MAINTENANCE })
export class MaintenanceProcessor extends BaseProcessor {
  protected readonly queue = JobQueue.MAINTENANCE;

  constructor(
    runner: JobRunnerService,
    private readonly maintenance: MaintenanceService,
  ) {
    super(runner);
  }

  process(job: Job) {
    return this.runner.run(this.queue, job, (ctx): Promise<unknown> => {
      if (job.name === JobNames.MAINTENANCE_PURGE_TOKENS) return this.maintenance.purgeTokens(ctx);
      if (job.name === JobNames.MAINTENANCE_PURGE_EXPORTS) return this.maintenance.purgeExports(ctx);
      if (job.name === JobNames.MAINTENANCE_PRUNE_JOB_RUNS) return this.maintenance.pruneJobRuns();
      return unknownJob(job);
    });
  }
}

export const PROCESSORS = [
  NotificationsProcessor,
  RemindersProcessor,
  ExpirationProcessor,
  DocumentProcessingProcessor,
  ExportsProcessor,
  MaintenanceProcessor,
];

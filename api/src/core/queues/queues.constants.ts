import { JobQueue } from 'generated/prisma';
import { APP_SLUG } from '@/shared/constants/app';

export const BULL_BOARD_ADAPTER = 'BULL_BOARD_ADAPTER';

/** Redis key prefix shared by every BullMQ queue of this application. */
export const QUEUE_PREFIX = APP_SLUG;

export const ALL_QUEUES: JobQueue[] = Object.values(JobQueue);

export const JobNames = {
  NOTIFICATION_DELIVER: 'notification.deliver',
  AUTH_EMAIL: 'auth.email',
  REMINDERS_SCAN: 'reminders.scan',
  EXPIRATION_SWEEP: 'expiration.sweep',
  DOCUMENT_PROCESS: 'document.process',
  EXPORT_ZIP: 'export.zip',
  EXPORT_CSV: 'export.csv',
  MAINTENANCE_PURGE_TOKENS: 'maintenance.purge-tokens',
  MAINTENANCE_PURGE_EXPORTS: 'maintenance.purge-exports',
  MAINTENANCE_PRUNE_JOB_RUNS: 'maintenance.prune-job-runs',
} as const;

export type JobName = (typeof JobNames)[keyof typeof JobNames];

/** Per-queue worker concurrency (CPU-heavy queues run low). */
export const QueueConcurrency: Record<JobQueue, number> = {
  NOTIFICATIONS: 10,
  REMINDERS: 1,
  EXPIRATION: 1,
  EMAIL_SYNC: 2,
  EMAIL_PROCESSING: 2,
  DOCUMENT_PROCESSING: 4,
  EXPORTS: 1,
  MAINTENANCE: 1,
};

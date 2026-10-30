import { JobQueue, JobTrigger } from 'generated/prisma';

export interface EnqueueJobOptions {
  queue: JobQueue;
  name: string;
  /** Identifiers and references only — never secrets, email bodies or document contents. */
  data?: Record<string, unknown>;
  /** Deterministic idempotency key; becomes the BullMQ job id. */
  jobId: string;
  organizationId?: string | null;
  trigger?: JobTrigger;
  entityType?: string;
  entityId?: string;
  parentJobRunId?: string;
  triggeredByUserId?: string;
  delayMs?: number;
  attempts?: number;
  backoffMs?: number;
  priority?: number;
}

export interface JobRunContext {
  jobRunId: string;
  attempt: number;
  log: (message: string, data?: Record<string, unknown>) => void;
  progress: (percent: number) => Promise<void>;
}

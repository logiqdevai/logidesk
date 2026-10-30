import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { JobQueue } from 'generated/prisma';
import { JobsService } from '@/core/jobs/jobs.service';
import { JobNames } from '@/core/queues/queues.constants';

/**
 * Registers repeatable schedulers in Redis at worker start-up (idempotent upserts). Nothing is
 * scheduled in process memory, so restarts never lose or duplicate schedules.
 */
@Injectable()
export class SchedulersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchedulersService.name);

  constructor(private readonly jobs: JobsService) {}

  async onApplicationBootstrap() {
    const defs: Array<{ queue: JobQueue; id: string; name: string; every: number }> = [
      { queue: JobQueue.REMINDERS, id: 'reminders-scan', name: JobNames.REMINDERS_SCAN, every: 5 * 60_000 },
      { queue: JobQueue.EXPIRATION, id: 'expiration-sweep', name: JobNames.EXPIRATION_SWEEP, every: 60 * 60_000 },
      { queue: JobQueue.MAINTENANCE, id: 'maintenance-purge-tokens', name: JobNames.MAINTENANCE_PURGE_TOKENS, every: 6 * 60 * 60_000 },
      { queue: JobQueue.MAINTENANCE, id: 'maintenance-purge-exports', name: JobNames.MAINTENANCE_PURGE_EXPORTS, every: 60 * 60_000 },
      { queue: JobQueue.MAINTENANCE, id: 'maintenance-prune-job-runs', name: JobNames.MAINTENANCE_PRUNE_JOB_RUNS, every: 24 * 60 * 60_000 },
    ];
    for (const def of defs) {
      await this.jobs.getQueue(def.queue).upsertJobScheduler(
        def.id,
        { every: def.every },
        {
          name: def.name,
          data: {},
          opts: { attempts: 2, backoff: { type: 'exponential', delay: 60_000 }, removeOnComplete: { count: 500 }, removeOnFail: { count: 1000 } },
        },
      );
    }
    this.logger.log(`Registered ${defs.length} repeatable schedulers`);
  }
}

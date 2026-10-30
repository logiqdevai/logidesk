import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitationStatus, JobQueue, JobRunStatus, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { JobRunContext } from '@/core/jobs/interfaces/jobs.interface';

/** MAINTENANCE queue: retention policies and housekeeping (all repeatable, idempotent). */
@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async purgeTokens(ctx: JobRunContext) {
    const now = new Date();
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const monthAgo = new Date(Date.now() - 30 * 86_400_000);
    const [resets, verifications, sessions, invitations] = await Promise.all([
      this.prisma.passwordResetToken.deleteMany({ where: { OR: [{ expires_at: { lt: weekAgo } }, { used_at: { lt: weekAgo } }] } }),
      this.prisma.emailVerificationToken.deleteMany({ where: { OR: [{ expires_at: { lt: weekAgo } }, { used_at: { lt: weekAgo } }] } }),
      this.prisma.session.deleteMany({ where: { OR: [{ expires_at: { lt: now } }, { revoked_at: { lt: monthAgo } }] } }),
      this.prisma.invitation.updateMany({
        where: { status: InvitationStatus.PENDING, expires_at: { lt: now } },
        data: { status: InvitationStatus.EXPIRED },
      }),
    ]);
    ctx.log('purged', { resets: resets.count, verifications: verifications.count, sessions: sessions.count });
    return { password_resets: resets.count, verifications: verifications.count, sessions: sessions.count, invitations_expired: invitations.count };
  }

  /** Export archives are kept privately for 24 hours. */
  async purgeExports(ctx: JobRunContext) {
    const cutoff = new Date(Date.now() - 24 * 3_600_000);
    const runs = await this.prisma.jobRun.findMany({
      where: { queue: JobQueue.EXPORTS, status: JobRunStatus.COMPLETED, finished_at: { lt: cutoff } },
      take: 500,
    });
    let purged = 0;
    for (const run of runs) {
      const result = (run.result ?? {}) as Record<string, any>;
      if (!result.storage_key || result.purged) continue;
      await this.storage.delete(result.storage_key).catch((e) => ctx.log('delete failed', { error: e.message }));
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: { result: { ...result, purged: true } as Prisma.InputJsonValue },
      });
      purged++;
    }
    return { purged };
  }

  /** Completed rows kept 30 days, failed 90 days by default (configurable). */
  async pruneJobRuns() {
    const completedDays = Number(this.config.get('JOB_RUNS_RETENTION_COMPLETED_DAYS') ?? 30);
    const failedDays = Number(this.config.get('JOB_RUNS_RETENTION_FAILED_DAYS') ?? 90);
    const [completed, failed] = await Promise.all([
      this.prisma.jobRun.deleteMany({
        where: { status: JobRunStatus.COMPLETED, finished_at: { lt: new Date(Date.now() - completedDays * 86_400_000) } },
      }),
      this.prisma.jobRun.deleteMany({
        where: { status: JobRunStatus.FAILED, finished_at: { lt: new Date(Date.now() - failedDays * 86_400_000) } },
      }),
    ]);
    return { completed: completed.count, failed: failed.count };
  }
}

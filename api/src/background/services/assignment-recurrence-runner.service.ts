import { Injectable } from '@nestjs/common';
import { AssignmentStatus, FormStatus, FormVersionStatus, RecurrenceOverlapPolicy, RecurrenceStatus } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { JobRunContext } from '@/core/jobs/interfaces/jobs.interface';
import { ActivityService } from '@/modules/activity/activity.service';
import { AssignableForm, AssignActor, AssignmentsService } from '@/modules/assignments/services/assignments.service';
import { rowToRule } from '@/modules/assignments/utils/recurrence.mapper';
import { computeDeadline, nextOccurrence, nextRun } from '@/modules/assignments/utils/recurrence.utils';
import { safeZone } from '@/shared/utils/dates/dates.utils';

type Outcome = 'created' | 'skipped' | 'paused' | 'stale';
const BATCH = 200;

/**
 * ASSIGNMENTS queue: creates the next assignment of every recurring series that is due. Each series is
 * handled under a lock and claimed with a compare-and-set on `next_run_at`, and assignments carry a
 * unique (series, form, occurrence number), so a repeated or concurrent run can never create duplicates.
 * Missed runs (worker down) produce a single catch-up assignment, never a backlog.
 */
@Injectable()
export class AssignmentRecurrenceRunnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignments: AssignmentsService,
    private readonly activity: ActivityService,
    private readonly cache: AppCacheService,
  ) {}

  async scan(ctx: JobRunContext) {
    const totals: Record<Outcome | 'due' | 'failed', number> = { due: 0, created: 0, skipped: 0, paused: 0, stale: 0, failed: 0 };
    for (;;) {
      const due = await this.prisma.assignmentRecurrence.findMany({
        where: { status: RecurrenceStatus.ACTIVE, next_run_at: { lte: new Date() } },
        orderBy: { next_run_at: 'asc' },
        take: BATCH,
        select: { id: true },
      });
      totals.due += due.length;
      let progressed = 0;
      for (const { id } of due) {
        const release = await this.cache.acquireLock(`assignment-recurrence:${id}`, 2 * 60_000);
        if (!release) continue;
        try {
          const outcome = await this.run(id, ctx);
          totals[outcome] += 1;
          if (outcome !== 'stale') progressed += 1;
        } catch (error) {
          totals.failed += 1;
          ctx.log('recurrence failed', { recurrence_id: id, error: error.message });
        } finally {
          await release();
        }
      }
      // Stop when the batch was the last one, or nothing moved (e.g. every remaining series keeps failing).
      if (due.length < BATCH || progressed === 0) break;
    }
    return totals;
  }

  private async run(id: string, ctx: JobRunContext): Promise<Outcome> {
    const now = new Date();
    const series = await this.prisma.assignmentRecurrence.findFirst({
      where: { id, status: RecurrenceStatus.ACTIVE, next_run_at: { lte: now } },
      include: { client: true, organization: { select: { time_zone: true, deleted_at: true } } },
    });
    if (!series || series.organization.deleted_at) return 'stale';

    const actor: AssignActor = { organization_id: series.organization_id, user_id: series.created_by_user_id };
    const rule = rowToRule(series);

    if (series.client.deleted_at || series.client.status === 'ARCHIVED') {
      await this.prisma.assignmentRecurrence.update({ where: { id }, data: { status: RecurrenceStatus.PAUSED, paused_at: now, next_run_at: null } });
      await this.activity.log({
        organizationId: series.organization_id,
        action: 'recurrence.paused',
        entityType: 'assignment_recurrence',
        entityId: id,
        clientId: series.client_id,
        description: 'Recurring assignment paused because the client is archived',
      });
      return 'paused';
    }

    const { eligible, unavailable } = await this.eligibleForms(series.organization_id, series.form_ids);
    let forms = eligible;
    let overlapping: string[] = [];
    if (series.overlap_policy === RecurrenceOverlapPolicy.SKIP && forms.length) {
      const open = await this.prisma.formAssignment.findMany({
        where: {
          recurrence_id: id,
          form_id: { in: forms.map((f) => f.id) },
          cancelled_at: null,
          status: { notIn: [AssignmentStatus.COMPLETE, AssignmentStatus.CANCELLED] },
        },
        select: { form_id: true },
      });
      overlapping = [...new Set(open.map((o) => o.form_id))];
      forms = forms.filter((f) => !overlapping.includes(f.id));
    }

    const created = series.occurrences_created + (forms.length ? 1 : 0);
    const next = nextRun(rule, now, created);
    const deadline = forms.length ? computeDeadline(rule, now, nextOccurrence(rule, now)) : null;

    const rows = await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.assignmentRecurrence.updateMany({
          where: { id, status: RecurrenceStatus.ACTIVE, next_run_at: series.next_run_at },
          data: {
            next_run_at: next,
            last_run_at: now,
            occurrences_created: created,
            ...(next ? {} : { status: RecurrenceStatus.ENDED, ended_at: now }),
          },
        });
        if (claimed.count !== 1) return null;
        if (!forms.length) return [];
        return this.assignments.createRows(
          tx,
          actor,
          series.client_id,
          forms,
          { reminder: series.reminder as Record<string, unknown> | null, message: series.message },
          deadline,
          { recurrence_id: id, occurrence_number: created },
        );
      },
      { timeout: 30_000 },
    );
    if (rows === null) return 'stale';

    if (unavailable.length || overlapping.length || !forms.length) {
      await this.activity.log({
        organizationId: series.organization_id,
        action: forms.length ? 'recurrence.partial' : 'recurrence.skipped',
        entityType: 'assignment_recurrence',
        entityId: id,
        clientId: series.client_id,
        description: forms.length
          ? 'Some forms were left out of a recurring assignment'
          : 'A recurring assignment was skipped',
        metadata: { unavailable_form_ids: unavailable, still_open_form_ids: overlapping },
      });
    }
    if (!rows.length) return 'skipped';

    await this.cache.invalidateOrganization(series.organization_id);
    if (series.notify_client) {
      try {
        await this.assignments.notifyAssigned(actor, series.client, rows, series.message, deadline, safeZone(series.time_zone));
      } catch (error) {
        ctx.log('recurrence notification failed', { recurrence_id: id, error: error.message });
      }
    }
    return 'created';
  }

  /** Forms that can still be assigned (not deleted, published with a published version). */
  private async eligibleForms(organizationId: string, formIds: string[]) {
    const rows = await this.prisma.form.findMany({
      where: { id: { in: formIds }, organization_id: organizationId, deleted_at: null },
      include: { current_version: { include: { document_requirements: { orderBy: { sort_order: 'asc' } } } } },
    });
    const eligible = rows.filter((f) => f.status === FormStatus.PUBLISHED && f.current_version?.status === FormVersionStatus.PUBLISHED) as AssignableForm[];
    const ids = new Set(eligible.map((f) => f.id));
    return { eligible, unavailable: formIds.filter((id) => !ids.has(id)) as string[] };
  }
}

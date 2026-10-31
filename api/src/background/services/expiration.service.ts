import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  AssignmentStatus,
  AutomationTrigger,
  JobTrigger,
  NotificationType,
  RequirementStatus,
  ReminderIntervalUnit,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { JobRunContext } from '@/core/jobs/interfaces/jobs.interface';
import { ActivityService } from '@/modules/activity/activity.service';
import { ProgressService } from '@/modules/assignments/services/progress.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { ReminderSchedulesService } from '@/modules/notifications/services/reminder-schedules.service';
import { documentList } from '@/modules/notifications/utils/template.utils';
import { intervalDays } from '@/modules/notifications/utils/reminder-schedule.utils';
import { addDays, dateOnly, diffDays, minutesOfDay, safeZone, toIsoDate } from '@/shared/utils/dates/dates.utils';

/**
 * EXPIRATION queue: marks documents whose expiration date has passed as expired (by
 * recalculating requirement/assignment status — history is never overwritten), audits it,
 * and sends the configured expiring / expired notifications. Safe to repeat.
 */
@Injectable()
export class ExpirationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
    private readonly schedules: ReminderSchedulesService,
    private readonly cache: AppCacheService,
  ) {}

  async sweep(ctx: JobRunContext) {
    const orgs = await this.prisma.organization.findMany({ where: { deleted_at: null }, select: { id: true, time_zone: true } });
    const totals = { organizations: orgs.length, expired: 0, expiring_notices: 0, expired_notices: 0 };
    for (const org of orgs) {
      const release = await this.cache.acquireLock(`expiration:${org.id}`, 10 * 60_000);
      if (!release) continue;
      try {
        const r = await this.sweepOrganization(org, ctx);
        totals.expired += r.expired;
        totals.expiring_notices += r.expiring;
        totals.expired_notices += r.expiredNotices;
      } catch (error) {
        ctx.log('organization sweep failed', { organization_id: org.id, error: error.message });
      } finally {
        await release();
      }
    }
    return totals;
  }

  private async sweepOrganization(org: { id: string; time_zone: string }, ctx: JobRunContext) {
    const zone = safeZone(org.time_zone);
    const now = DateTime.now().setZone(zone);
    const today = dateOnly(now.toISODate());

    // 1. Newly expired requirements.
    const newlyExpired = await this.prisma.assignmentRequirement.findMany({
      where: {
        organization_id: org.id,
        status: { in: [RequirementStatus.APPROVED, RequirementStatus.UNDER_REVIEW, RequirementStatus.SUBMITTED] },
        current_document: { expiration_date: { lt: today }, deleted_at: null },
        assignment: { cancelled_at: null },
      },
      include: {
        document_requirement: { select: { name: true } },
        current_document: { select: { id: true, expiration_date: true, title: true } },
        assignment: { select: { id: true, client_id: true } },
      },
    });
    const touched = new Set<string>();
    for (const ar of newlyExpired) {
      touched.add(ar.assignment.id);
      await this.activity.log({
        organizationId: org.id,
        action: 'document.expired',
        entityType: 'document',
        entityId: ar.current_document.id,
        documentId: ar.current_document.id,
        clientId: ar.assignment.client_id,
        assignmentId: ar.assignment.id,
        description: `${ar.document_requirement.name} expired on ${toIsoDate(ar.current_document.expiration_date)}`,
      });
    }
    // Deadlines are timestamps: assignments whose deadline just passed become overdue.
    const pastDeadline = await this.prisma.formAssignment.findMany({
      where: {
        organization_id: org.id,
        cancelled_at: null,
        completed_at: null,
        deadline: { lt: new Date() },
        status: { notIn: [AssignmentStatus.OVERDUE, AssignmentStatus.COMPLETE, AssignmentStatus.CANCELLED] },
      },
      select: { id: true },
    });
    for (const a of pastDeadline) touched.add(a.id);
    for (const assignmentId of touched) await this.progress.recalcAssignment(assignmentId);
    if (touched.size) await this.cache.invalidateOrganization(org.id);

    // Notifications go out at the organization's default send time.
    const orgDefault = await this.schedules.organizationDefault(org.id);
    const sendTime = (orgDefault?.send_time as string) || '09:00';
    if (now.hour * 60 + now.minute < (minutesOfDay(sendTime) ?? 540)) {
      return { expired: newlyExpired.length, expiring: 0, expiredNotices: 0 };
    }
    const settings = await this.prisma.notificationSettings.findUnique({ where: { organization_id: org.id } });
    if (settings && !settings.auto_reminders_enabled) return { expired: newlyExpired.length, expiring: 0, expiredNotices: 0 };

    const rules = await this.prisma.automationRule.findMany({
      where: { organization_id: org.id, form_id: null, trigger: { in: [AutomationTrigger.DOCUMENT_EXPIRING, AutomationTrigger.DOCUMENT_EXPIRED] } },
    });
    const expiringRule = rules.find((r) => r.trigger === AutomationTrigger.DOCUMENT_EXPIRING);
    const expiredRule = rules.find((r) => r.trigger === AutomationTrigger.DOCUMENT_EXPIRED);
    let expiring = 0;
    let expiredNotices = 0;

    // 2. Expiring soon: notify N days before (offsets configurable, e.g. 30, 7, 0).
    if (!expiringRule || expiringRule.enabled) {
      const offsets = expiringRule?.offsets_days?.length ? expiringRule.offsets_days : [30, 7, 0];
      for (const offset of offsets) {
        const target = addDays(today, offset);
        const due = await this.prisma.assignmentRequirement.findMany({
          where: {
            organization_id: org.id,
            status: { in: [RequirementStatus.APPROVED, RequirementStatus.UNDER_REVIEW] },
            current_document: { expiration_date: target, deleted_at: null },
            assignment: { cancelled_at: null, client: { deleted_at: null, email: { not: null } } },
          },
          include: {
            document_requirement: { select: { name: true } },
            current_document: { select: { id: true, expiration_date: true } },
            assignment: { select: { id: true, client: true } },
          },
        });
        for (const ar of due) {
          const n = await this.notifyClient(org.id, ar, NotificationType.EXPIRING_DOCUMENTS, expiringRule?.id, `expiring:${ar.current_document.id}:${offset}`, ctx);
          if (n) expiring++;
        }
      }
    }

    // 3. Expired: notify on expiry and keep reminding until a replacement is approved.
    if (!expiredRule || expiredRule.enabled) {
      const expired = await this.prisma.assignmentRequirement.findMany({
        where: {
          organization_id: org.id,
          status: RequirementStatus.EXPIRED,
          assignment: { cancelled_at: null, client: { deleted_at: null, email: { not: null } } },
        },
        include: {
          document_requirement: { select: { name: true } },
          current_document: { select: { id: true, expiration_date: true } },
          assignment: { select: { id: true, client: true } },
        },
      });
      const every = expiredRule?.repeat_enabled
        ? intervalDays(expiredRule.repeat_interval_count ?? 1, expiredRule.repeat_interval_unit ?? ReminderIntervalUnit.WEEKS)
        : null;
      for (const ar of expired) {
        if (!ar.current_document?.expiration_date) continue;
        const since = diffDays(ar.current_document.expiration_date, today);
        let sequence: number | null = null;
        if (since >= 0 && since <= 1) sequence = 0;
        else if (every && since > 0 && since % every === 0) sequence = Math.floor(since / every);
        if (sequence === null) {
          // First notice may have been missed (e.g. worker down): send it once.
          sequence = 0;
        }
        if (expiredRule?.max_sends && sequence >= expiredRule.max_sends) continue;
        const n = await this.notifyClient(org.id, ar, NotificationType.EXPIRED_DOCUMENTS, expiredRule?.id, `expired:${ar.current_document.id}:${sequence}`, ctx);
        if (n) expiredNotices++;
      }
    }
    return { expired: newlyExpired.length, expiring, expiredNotices };
  }

  private async notifyClient(
    organizationId: string,
    ar: {
      id: string;
      document_requirement: { name: string };
      current_document: { id: string; expiration_date: Date | null };
      assignment: { id: string; client: { id: string; email: string | null; first_name: string; last_name: string } };
    },
    type: NotificationType,
    ruleId: string | undefined,
    idempotencyKey: string,
    ctx: JobRunContext,
  ) {
    const client = ar.assignment.client;
    if (!client.email) return null;
    const clientUser = await this.prisma.clientUser.findFirst({ where: { client_id: client.id, status: 'ACTIVE' } });
    return this.notifications.notify({
      organizationId,
      type,
      recipientAddress: client.email,
      recipientName: `${client.first_name} ${client.last_name}`,
      clientId: client.id,
      clientUserId: clientUser?.id,
      assignmentId: ar.assignment.id,
      automationRuleId: ruleId,
      variables: {
        client_name: client.first_name,
        missing_documents: documentList([{ name: ar.document_requirement.name }]),
        document_name: ar.document_requirement.name,
        expiration_date: toIsoDate(ar.current_document.expiration_date),
        portal_link: this.notifications.portalUrl(),
      },
      metadata: { assignment_requirement_ids: [ar.id], document_id: ar.current_document.id },
      idempotencyKey,
      respectQuietHours: true,
      jobTrigger: JobTrigger.JOB,
      parentJobRunId: ctx.jobRunId,
    });
  }
}

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  AutomationTrigger,
  ClientStatus,
  JobTrigger,
  NotificationChannel,
  NotificationTrigger,
  NotificationType,
  RequirementStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { JobRunContext } from '@/core/jobs/interfaces/jobs.interface';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { ActivityService } from '@/modules/activity/activity.service';
import { applyQuietHours, dateOnly, localDateOf, minutesOfDay, safeZone, toIsoDate, toIsoDateTime } from '@/shared/utils/dates/dates.utils';
import { OPEN_REQUIREMENT_STATUSES } from '@/modules/assignments/utils/status.utils';
import { documentList } from '../utils/template.utils';
import { isReminderDue } from '../utils/reminder-schedule.utils';
import { NotificationsService } from './notifications.service';
import { REQUIREMENT_SCHEDULE_INCLUDE, ReminderSchedulesService } from './reminder-schedules.service';

const STATUS_LABEL: Partial<Record<RequirementStatus, string>> = {
  MISSING: 'missing',
  REJECTED: 'rejected — please re-upload',
  EXPIRED: 'expired — please upload a replacement',
};

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
    private readonly notifications: NotificationsService,
    private readonly schedules: ReminderSchedulesService,
    private readonly activity: ActivityService,
    private readonly cache: AppCacheService,
  ) {}

  private async openItems(organizationId: string, clientId: string, assignmentId?: string) {
    return this.prisma.assignmentRequirement.findMany({
      where: {
        organization_id: organizationId,
        status: { in: OPEN_REQUIREMENT_STATUSES },
        assignment: { client_id: clientId, cancelled_at: null, ...(assignmentId ? { id: assignmentId } : {}) },
      },
      include: {
        document_requirement: { select: { name: true } },
        assignment: { select: { id: true, deadline: true, form: { select: { name: true } } } },
        current_document: { select: { expiration_date: true } },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /** Manual reminder preview: recipient, outstanding documents, message and channel. */
  async preview(ws: WorkspaceContext, clientId: string, assignmentId?: string) {
    const client = await this.access.assertClient(ws, clientId);
    const items = await this.openItems(ws.organization_id, clientId, assignmentId);
    const forms = Array.from(new Set(items.map((i) => i.assignment.form.name)));
    const rendered = await this.notifications.render(ws.organization_id, NotificationType.MISSING_DOCUMENTS, {
      client_name: client.first_name,
      form_name: forms.join(', '),
      missing_documents: documentList(items.map((i) => ({ name: i.document_requirement.name, detail: STATUS_LABEL[i.status] }))),
      portal_link: this.notifications.portalUrl(),
      expiration_date: '',
    });
    return {
      recipient: { name: `${client.first_name} ${client.last_name}`, email: client.email },
      channel: NotificationChannel.EMAIL,
      items: items.map((i) => ({
        assignment_requirement_id: i.id,
        assignment_id: i.assignment.id,
        name: i.document_requirement.name,
        form_name: i.assignment.form.name,
        status: i.status,
        deadline: toIsoDateTime(i.deadline ?? i.assignment.deadline),
        expiration_date: toIsoDate(i.current_document?.expiration_date),
      })),
      subject: rendered.subject,
      body: rendered.body,
    };
  }

  async sendManual(
    ws: WorkspaceContext,
    input: { client_id: string; assignment_id?: string; subject?: string; body?: string },
  ) {
    const client = await this.access.assertClient(ws, input.client_id);
    if (!client.email) throw new BadRequestException('This client has no email address');
    const items = await this.openItems(ws.organization_id, client.id, input.assignment_id);
    const preview = await this.preview(ws, client.id, input.assignment_id);
    const clientUser = await this.prisma.clientUser.findFirst({ where: { client_id: client.id, status: 'ACTIVE' } });
    const notification = await this.notifications.notify({
      organizationId: ws.organization_id,
      type: NotificationType.MANUAL_REMINDER,
      trigger: NotificationTrigger.MANUAL,
      recipientAddress: client.email,
      recipientName: `${client.first_name} ${client.last_name}`,
      clientId: client.id,
      clientUserId: clientUser?.id,
      assignmentId: input.assignment_id ?? items[0]?.assignment.id ?? null,
      sentByUserId: ws.user_id,
      subject: input.subject?.trim() || preview.subject,
      body: input.body?.trim() || preview.body,
      metadata: { assignment_requirement_ids: items.map((i) => i.id) },
      idempotencyKey: `manual:${client.id}:${ws.user_id}:${Date.now()}`,
    });
    if (items.length) {
      await this.prisma.assignmentRequirement.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data: { last_reminder_sent_at: new Date(), reminders_sent_count: { increment: 1 } },
      });
    }
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'reminder.sent',
      entityType: 'notification',
      entityId: notification?.id,
      clientId: client.id,
      assignmentId: input.assignment_id ?? null,
      actorUserId: ws.user_id,
      description: `Reminder sent to ${client.first_name} ${client.last_name} (${items.length} document${items.length === 1 ? '' : 's'})`,
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    return { notification_id: notification?.id ?? null, status: notification?.status ?? 'SKIPPED' };
  }

  /** Dashboard "Send reminders": one reminder per selected client with the default message. */
  async sendBulk(ws: WorkspaceContext, clientIds: string[]) {
    const results = [];
    for (const clientId of clientIds.slice(0, 200)) {
      try {
        const client = await this.access.assertClient(ws, clientId);
        if (!client.email) {
          results.push({ client_id: clientId, sent: false, reason: 'No email address' });
          continue;
        }
        const items = await this.openItems(ws.organization_id, clientId);
        if (!items.length) {
          results.push({ client_id: clientId, sent: false, reason: 'Nothing outstanding' });
          continue;
        }
        await this.sendManual(ws, { client_id: clientId });
        results.push({ client_id: clientId, sent: true });
      } catch (error) {
        results.push({ client_id: clientId, sent: false, reason: error.message });
      }
    }
    return { sent: results.filter((r) => r.sent).length, results };
  }

  // ── Automatic reminders (REMINDERS queue, repeatable every 5 minutes) ─────────

  /**
   * For each organization whose send time has been reached today, evaluates the effective
   * schedule of every open requirement and enqueues one combined reminder per client.
   * Idempotent: keyed by client + local date + send time.
   */
  async scan(ctx: JobRunContext) {
    const orgs = await this.prisma.organization.findMany({
      where: { deleted_at: null, notification_settings: { auto_reminders_enabled: true } },
      select: { id: true, name: true, time_zone: true, notification_settings: true },
    });
    let enqueued = 0;
    for (const org of orgs) {
      const release = await this.cache.acquireLock(`reminders:${org.id}`, 4 * 60_000);
      if (!release) continue;
      try {
        enqueued += await this.scanOrganization(org, ctx);
      } catch (error) {
        ctx.log('organization scan failed', { organization_id: org.id, error: error.message });
      } finally {
        await release();
      }
    }
    return { organizations: orgs.length, reminders: enqueued };
  }

  private async scanOrganization(
    org: { id: string; time_zone: string; notification_settings: { quiet_hours_start: string | null; quiet_hours_end: string | null } },
    ctx: JobRunContext,
  ) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { organization_id: org.id, trigger: AutomationTrigger.MISSING_DOCUMENTS, form_id: null },
    });
    if (rule && !rule.enabled) return 0;
    const zone = safeZone(org.time_zone);
    const now = DateTime.now().setZone(zone);
    const todayIso = now.toISODate();
    const today = dateOnly(todayIso);
    const nowMinutes = now.hour * 60 + now.minute;
    const orgDefault = await this.schedules.organizationDefault(org.id);

    const requirements = await this.prisma.assignmentRequirement.findMany({
      where: {
        organization_id: org.id,
        status: { in: OPEN_REQUIREMENT_STATUSES },
        document_requirement: { is_required: true },
        assignment: { cancelled_at: null, client: { deleted_at: null, status: ClientStatus.ACTIVE, email: { not: null } } },
      },
      include: {
        ...REQUIREMENT_SCHEDULE_INCLUDE,
        document_requirement: { select: { name: true, reminder_schedule: true } },
        assignment: {
          select: {
            id: true,
            assigned_at: true,
            deadline: true,
            client_id: true,
            form: { select: { name: true } },
            reminder_schedule: true,
            form_version: { select: { default_reminder_schedule: true } },
          },
        },
      },
    });

    // Group due requirements per client and send time.
    const groups = new Map<string, { clientId: string; sendTime: string; overdue: boolean; items: typeof requirements }>();
    for (const ar of requirements) {
      const schedule = this.schedules.resolve(orgDefault, ar as any);
      const sendTime = applyQuietHours(schedule.send_time, org.notification_settings.quiet_hours_start, org.notification_settings.quiet_hours_end);
      if (nowMinutes < (minutesOfDay(sendTime) ?? 0)) continue;
      const assignedOn = dateOnly(DateTime.fromJSDate(ar.assignment.assigned_at).setZone(zone).toISODate());
      const decision = isReminderDue({
        schedule,
        today,
        assignedOn,
        deadline: localDateOf(ar.deadline ?? ar.assignment.deadline, zone),
        overdueSentCount: ar.overdue_reminders_sent_count,
      });
      if (!decision.due) continue;
      if (ar.last_reminder_sent_at && DateTime.fromJSDate(ar.last_reminder_sent_at).setZone(zone).toISODate() === todayIso) continue;
      const key = `${ar.assignment.client_id}|${sendTime}`;
      const group = groups.get(key) ?? { clientId: ar.assignment.client_id, sendTime, overdue: false, items: [] };
      group.items.push(ar);
      group.overdue = group.overdue || decision.overdue;
      groups.set(key, group);
    }

    let sent = 0;
    for (const group of groups.values()) {
      const client = await this.prisma.client.findUnique({ where: { id: group.clientId } });
      if (!client?.email) continue;
      const clientUser = await this.prisma.clientUser.findFirst({ where: { client_id: client.id, status: 'ACTIVE' } });
      const forms = Array.from(new Set(group.items.map((i) => i.assignment.form.name)));
      const notification = await this.notifications.notify({
        organizationId: org.id,
        type: NotificationType.MISSING_DOCUMENTS,
        trigger: NotificationTrigger.AUTOMATIC,
        recipientAddress: client.email,
        recipientName: `${client.first_name} ${client.last_name}`,
        clientId: client.id,
        clientUserId: clientUser?.id,
        assignmentId: group.items[0].assignment.id,
        automationRuleId: rule?.id,
        variables: {
          client_name: client.first_name,
          form_name: forms.join(', '),
          missing_documents: documentList(group.items.map((i) => ({ name: i.document_requirement.name, detail: STATUS_LABEL[i.status] }))),
          portal_link: this.notifications.portalUrl(),
        },
        metadata: { assignment_requirement_ids: group.items.map((i) => i.id), overdue: group.overdue },
        idempotencyKey: `reminder:${client.id}:${todayIso}:${group.sendTime}`,
        jobTrigger: JobTrigger.JOB,
        parentJobRunId: ctx.jobRunId,
      });
      if (!notification) continue;
      sent++;
      for (const item of group.items) {
        const overdue = localDateOf(item.deadline ?? item.assignment.deadline, zone)?.getTime() < today.getTime();
        await this.prisma.assignmentRequirement.update({
          where: { id: item.id },
          data: {
            last_reminder_sent_at: new Date(),
            reminders_sent_count: { increment: 1 },
            ...(overdue ? { overdue_reminders_sent_count: { increment: 1 } } : {}),
          },
        });
      }
      await this.activity.log({
        organizationId: org.id,
        action: 'reminder.sent',
        entityType: 'notification',
        entityId: notification.id,
        clientId: client.id,
        description: `Automatic reminder sent (${group.items.length} document${group.items.length === 1 ? '' : 's'})`,
      });
    }
    if (sent) ctx.log('reminders enqueued', { organization_id: org.id, count: sent });
    return sent;
  }
}

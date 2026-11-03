import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  AutomationTrigger,
  ClientStatus,
  FormResponseStatus,
  JobTrigger,
  NotificationChannel,
  NotificationTrigger,
  NotificationType,
  Prisma,
  ReminderIntervalUnit,
  RequirementStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { JobRunContext } from '@/core/jobs/interfaces/jobs.interface';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { ActivityService } from '@/modules/activity/activity.service';
import {
  applyQuietHours,
  dateOnly,
  formatDeadline,
  isInQuietHours,
  localDateOf,
  minutesOfDay,
  safeZone,
  toIsoDate,
  toIsoDateTime,
} from '@/shared/utils/dates/dates.utils';
import { OPEN_REQUIREMENT_STATUSES } from '@/modules/assignments/utils/status.utils';
import { allFields, FormDefinition, VALUE_FIELD_TYPES } from '@/modules/forms/utils/form-definition.utils';
import { documentList } from '../utils/template.utils';
import { emailStrings } from '../utils/email-i18n';
import { EffectiveSchedule, isReminderDue } from '../utils/reminder-schedule.utils';
import { NotificationsService } from './notifications.service';
import { ASSIGNMENT_SCHEDULE_SELECT, REQUIREMENT_SCHEDULE_INCLUDE, ReminderSchedulesService } from './reminder-schedules.service';

/** Something a reminder asks the client for: a document, or the unanswered questions of a form. */
interface ReminderItem {
  kind: 'document' | 'questions';
  /** AssignmentRequirement id (documents) or FormAssignment id (questions). */
  id: string;
  assignmentId: string;
  name: string;
  formName: string;
  status: RequirementStatus;
  deadline: Date | null;
  expirationDate: Date | null;
}

/** Assignments whose form questions still need the client's answers. */
const PENDING_RESPONSE_WHERE: Prisma.FormAssignmentWhereInput = {
  cancelled_at: null,
  completed_at: null,
  OR: [{ response: { is: null } }, { response: { is: { status: { not: FormResponseStatus.SUBMITTED } } } }],
};

/** True when the form version has required questions (non-file fields) the client must answer. */
const needsAnswers = (definition: unknown) =>
  allFields((definition as FormDefinition) ?? { sections: [] }).some((f) => f.required && VALUE_FIELD_TYPES.includes(f.type));

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

  /** Everything the client still owes: open documents plus the questions of unsubmitted forms. */
  private async openItems(organizationId: string, clientId: string, assignmentId?: string, questionsLabel?: (form: string) => string) {
    const scope = { client_id: clientId, cancelled_at: null, ...(assignmentId ? { id: assignmentId } : {}) };
    const [requirements, pending] = await Promise.all([
      this.prisma.assignmentRequirement.findMany({
        where: { organization_id: organizationId, status: { in: OPEN_REQUIREMENT_STATUSES }, assignment: scope },
        include: {
          document_requirement: { select: { name: true } },
          assignment: { select: { id: true, deadline: true, form: { select: { name: true } } } },
          current_document: { select: { expiration_date: true } },
        },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.formAssignment.findMany({
        where: { organization_id: organizationId, ...scope, ...PENDING_RESPONSE_WHERE },
        select: { id: true, deadline: true, form: { select: { name: true } }, form_version: { select: { definition: true } } },
        orderBy: { assigned_at: 'asc' },
      }),
    ]);
    const label = questionsLabel ?? emailStrings('en').formQuestions;
    const items: ReminderItem[] = [
      ...pending
        .filter((a) => needsAnswers(a.form_version.definition))
        .map((a) => ({
          kind: 'questions' as const,
          id: a.id,
          assignmentId: a.id,
          name: label(a.form.name),
          formName: a.form.name,
          status: RequirementStatus.MISSING,
          deadline: a.deadline,
          expirationDate: null,
        })),
      ...requirements.map((i) => ({
        kind: 'document' as const,
        id: i.id,
        assignmentId: i.assignment.id,
        name: i.document_requirement.name,
        formName: i.assignment.form.name,
        status: i.status,
        deadline: i.deadline ?? i.assignment.deadline,
        expirationDate: i.current_document?.expiration_date ?? null,
      })),
    ];
    return items;
  }

  /** Template variables shared by manual and automatic reminders (list with per-item deadline + deadline paragraph). */
  private reminderVariables(items: ReminderItem[], language: string, zone: string, now: Date) {
    const strings = emailStrings(language);
    const fmt = (d: Date) => formatDeadline(d, zone, language);
    const missing = documentList(
      items.map((i) => {
        const status = i.kind === 'document' ? strings.requirementStatus[i.status] : undefined;
        const due = i.deadline ? (i.deadline.getTime() < now.getTime() ? strings.overdueSince(fmt(i.deadline)) : strings.dueBy(fmt(i.deadline))) : undefined;
        return { name: i.name, detail: [status, due].filter(Boolean).join(' · ') || undefined };
      }),
    );
    const earliest = items.reduce<Date | null>((min, i) => (i.deadline && (!min || i.deadline < min) ? i.deadline : min), null);
    return {
      form_name: Array.from(new Set(items.map((i) => i.formName))).join('", "'),
      missing_documents: missing,
      deadline: earliest ? fmt(earliest) : '',
      deadline_notice: earliest ? (earliest.getTime() < now.getTime() ? strings.deadlinePassed(fmt(earliest)) : strings.deadlineUpcoming(fmt(earliest))) : '',
      portal_link: this.notifications.portalUrl(),
    };
  }

  private async orgZone(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { time_zone: true } });
    return safeZone(org?.time_zone);
  }

  /** Manual reminder preview: recipient, outstanding items, message and channel. */
  async preview(ws: WorkspaceContext, clientId: string, assignmentId?: string) {
    const client = await this.access.assertClient(ws, clientId);
    const language = await this.notifications.emailLanguage(ws.organization_id, clientId);
    const items = await this.openItems(ws.organization_id, clientId, assignmentId, emailStrings(language).formQuestions);
    const zone = await this.orgZone(ws.organization_id);
    const rendered = await this.notifications.render(
      ws.organization_id,
      NotificationType.MISSING_DOCUMENTS,
      { client_name: client.first_name, ...this.reminderVariables(items, language, zone, new Date()), expiration_date: '' },
      NotificationChannel.EMAIL,
      client.id,
    );
    return {
      recipient: { name: `${client.first_name} ${client.last_name}`, email: client.email },
      channel: NotificationChannel.EMAIL,
      items: items.map((i) => ({
        kind: i.kind,
        assignment_requirement_id: i.kind === 'document' ? i.id : null,
        assignment_id: i.assignmentId,
        name: i.name,
        form_name: i.formName,
        status: i.status,
        deadline: toIsoDateTime(i.deadline),
        expiration_date: toIsoDate(i.expirationDate),
      })),
      subject: rendered.subject,
      body: rendered.body,
    };
  }

  /** Records that a reminder went out for these items (per document requirement / per assignment for questions). */
  private async markSent(items: ReminderItem[], overdue: (item: ReminderItem) => boolean = () => false) {
    for (const item of items) {
      const data = {
        last_reminder_sent_at: new Date(),
        reminders_sent_count: { increment: 1 },
        ...(overdue(item) ? { overdue_reminders_sent_count: { increment: 1 } } : {}),
      };
      if (item.kind === 'document') await this.prisma.assignmentRequirement.update({ where: { id: item.id }, data });
      else await this.prisma.formAssignment.update({ where: { id: item.id }, data });
    }
  }

  async sendManual(
    ws: WorkspaceContext,
    input: { client_id: string; assignment_id?: string; subject?: string; body?: string },
  ) {
    const client = await this.access.assertClient(ws, input.client_id);
    if (client.status === ClientStatus.ARCHIVED) throw new BadRequestException('Restore the client before sending reminders');
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
      assignmentId: input.assignment_id ?? items[0]?.assignmentId ?? null,
      sentByUserId: ws.user_id,
      subject: input.subject?.trim() || preview.subject,
      body: input.body?.trim() || preview.body,
      metadata: {
        assignment_requirement_ids: items.filter((i) => i.kind === 'document').map((i) => i.id),
        assignment_ids: items.filter((i) => i.kind === 'questions').map((i) => i.id),
      },
      idempotencyKey: `manual:${client.id}:${ws.user_id}:${Date.now()}`,
    });
    await this.markSent(items);
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'reminder.sent',
      entityType: 'notification',
      entityId: notification?.id,
      clientId: client.id,
      assignmentId: input.assignment_id ?? null,
      actorUserId: ws.user_id,
      description: `Reminder sent to ${client.first_name} ${client.last_name} (${items.length} item${items.length === 1 ? '' : 's'})`,
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
        if (client.status === ClientStatus.ARCHIVED) {
          results.push({ client_id: clientId, sent: false, reason: 'Client is archived' });
          continue;
        }
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
   * schedule of every open requirement and every unsubmitted form, and enqueues one combined
   * reminder per client. Idempotent: keyed by client + local date + send time.
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
    const zone = safeZone(org.time_zone);
    const now = DateTime.now().setZone(zone);
    const todayIso = now.toISODate();
    const today = dateOnly(todayIso);
    const nowMinutes = now.hour * 60 + now.minute;
    const orgDefault = await this.schedules.organizationDefault(org.id);
    const { quiet_hours_start: quietStart, quiet_hours_end: quietEnd } = org.notification_settings;
    const activeClient: Prisma.ClientWhereInput = { deleted_at: null, status: ClientStatus.ACTIVE, email: { not: null } };

    const [requirements, pendingForms] = await Promise.all([
      this.prisma.assignmentRequirement.findMany({
        where: {
          organization_id: org.id,
          status: { in: OPEN_REQUIREMENT_STATUSES },
          document_requirement: { is_required: true },
          assignment: { cancelled_at: null, client: activeClient },
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
      }),
      this.prisma.formAssignment.findMany({
        where: { organization_id: org.id, ...PENDING_RESPONSE_WHERE, client: activeClient },
        select: {
          ...ASSIGNMENT_SCHEDULE_SELECT,
          id: true,
          assigned_at: true,
          deadline: true,
          client_id: true,
          last_reminder_sent_at: true,
          overdue_reminders_sent_count: true,
          form: { select: { name: true } },
          form_version: { select: { ...ASSIGNMENT_SCHEDULE_SELECT.form_version.select, definition: true } },
        },
      }),
    ]);

    /** Whether a reminder is due now for one item; null when not. */
    const due = (input: {
      schedule: EffectiveSchedule;
      assignedAt: Date;
      deadline: Date | null;
      overdueSentCount: number;
      lastReminderSentAt: Date | null;
    }) => {
      const sendTime = applyQuietHours(input.schedule.send_time, quietStart, quietEnd);
      const decision = isReminderDue({
        schedule: input.schedule,
        today,
        assignedOn: dateOnly(DateTime.fromJSDate(input.assignedAt).setZone(zone).toISODate()),
        deadline: localDateOf(input.deadline, zone),
        overdueSentCount: input.overdueSentCount,
        now: now.toJSDate(),
        assignedAt: input.assignedAt,
        lastReminderSentAt: input.lastReminderSentAt,
      });
      if (!decision.due) return null;
      const unit = decision.overdue ? input.schedule.overdue_interval_unit : input.schedule.interval_unit;
      const hourly = unit === ReminderIntervalUnit.HOURS;
      if (hourly && isInQuietHours(nowMinutes, quietStart, quietEnd)) return null;
      if (!hourly && nowMinutes < (minutesOfDay(sendTime) ?? 0)) return null;
      if (!hourly && input.lastReminderSentAt && DateTime.fromJSDate(input.lastReminderSentAt).setZone(zone).toISODate() === todayIso) return null;
      return { sendTime, hourly, overdue: decision.overdue };
    };

    // Group due items per client and send time.
    const groups = new Map<string, { clientId: string; sendTime: string; overdue: boolean; hourly: boolean; items: ReminderItem[] }>();
    const add = (clientId: string, decision: NonNullable<ReturnType<typeof due>>, item: ReminderItem) => {
      const key = `${clientId}|${decision.sendTime}`;
      const group = groups.get(key) ?? { clientId, sendTime: decision.sendTime, overdue: false, hourly: false, items: [] };
      group.items.push(item);
      group.hourly = group.hourly || decision.hourly;
      group.overdue = group.overdue || decision.overdue;
      groups.set(key, group);
    };

    for (const a of pendingForms) {
      if (!needsAnswers(a.form_version.definition)) continue;
      const decision = due({
        schedule: this.schedules.resolveForAssignment(orgDefault, a),
        assignedAt: a.assigned_at,
        deadline: a.deadline,
        overdueSentCount: a.overdue_reminders_sent_count,
        lastReminderSentAt: a.last_reminder_sent_at,
      });
      if (!decision) continue;
      add(a.client_id, decision, {
        kind: 'questions',
        id: a.id,
        assignmentId: a.id,
        name: a.form.name,
        formName: a.form.name,
        status: RequirementStatus.MISSING,
        deadline: a.deadline,
        expirationDate: null,
      });
    }

    for (const ar of requirements) {
      const decision = due({
        schedule: this.schedules.resolve(orgDefault, ar as any),
        assignedAt: ar.assignment.assigned_at,
        deadline: ar.deadline ?? ar.assignment.deadline,
        overdueSentCount: ar.overdue_reminders_sent_count,
        lastReminderSentAt: ar.last_reminder_sent_at,
      });
      if (!decision) continue;
      add(ar.assignment.client_id, decision, {
        kind: 'document',
        id: ar.id,
        assignmentId: ar.assignment.id,
        name: ar.document_requirement.name,
        formName: ar.assignment.form.name,
        status: ar.status,
        deadline: ar.deadline ?? ar.assignment.deadline,
        expirationDate: null,
      });
    }

    let sent = 0;
    for (const group of groups.values()) {
      const client = await this.prisma.client.findUnique({ where: { id: group.clientId } });
      if (!client?.email) continue;
      const clientUser = await this.prisma.clientUser.findFirst({ where: { client_id: client.id, status: 'ACTIVE' } });
      const language = await this.notifications.emailLanguage(org.id, client.id);
      const strings = emailStrings(language);
      // Question items carry the form name until the language is known.
      const items = group.items.map((i) => (i.kind === 'questions' ? { ...i, name: strings.formQuestions(i.formName) } : i));
      const notification = await this.notifications.notify({
        organizationId: org.id,
        type: NotificationType.MISSING_DOCUMENTS,
        trigger: NotificationTrigger.AUTOMATIC,
        recipientAddress: client.email,
        recipientName: `${client.first_name} ${client.last_name}`,
        clientId: client.id,
        clientUserId: clientUser?.id,
        assignmentId: items[0].assignmentId,
        automationRuleId: rule?.id,
        variables: { client_name: client.first_name, ...this.reminderVariables(items, language, zone, now.toJSDate()) },
        metadata: {
          assignment_requirement_ids: items.filter((i) => i.kind === 'document').map((i) => i.id),
          assignment_ids: items.filter((i) => i.kind === 'questions').map((i) => i.id),
          overdue: group.overdue,
        },
        idempotencyKey: `reminder:${client.id}:${todayIso}:${group.sendTime}${group.hourly ? `:h${now.hour}` : ''}`,
        jobTrigger: JobTrigger.JOB,
        parentJobRunId: ctx.jobRunId,
      });
      if (!notification) continue;
      sent++;
      await this.markSent(items, (item) => (localDateOf(item.deadline, zone)?.getTime() ?? Infinity) < today.getTime());
      await this.activity.log({
        organizationId: org.id,
        action: 'reminder.sent',
        entityType: 'notification',
        entityId: notification.id,
        clientId: client.id,
        description: `Automatic reminder sent (${items.length} item${items.length === 1 ? '' : 's'})`,
      });
    }
    if (sent) ctx.log('reminders enqueued', { organization_id: org.id, count: sent });
    return sent;
  }
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { NotificationChannel, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { ActivityService, fullName } from '@/modules/activity/activity.service';
import { paginate } from '@/shared/utils/pagination/pagination.utils';
import { NotificationProvidersService } from '@/integrations/notifications/providers/notification-providers.service';
import { CreateTemplateDto, NotificationQueryType, UpdateNotificationSettingsDto, UpdateTemplateDto } from '../dto/notifications.dto';
import { describeSchedule, resolveSchedule } from '../utils/reminder-schedule.utils';
import { TEMPLATE_VARIABLES } from '../utils/default-templates.constants';
import { SECURE_LINK_PLACEHOLDER } from './notifications.service';

/** Notifications page (history), templates and Settings > Notifications. */
@Injectable()
export class NotificationAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
    private readonly activity: ActivityService,
    private readonly providers: NotificationProvidersService,
  ) {}

  async history(ws: WorkspaceContext, query: NotificationQueryType) {
    const where: Prisma.NotificationWhereInput = { organization_id: ws.organization_id };
    if (!this.access.canSeeAll(ws)) {
      where.OR = [{ client: { assignees: { some: { organization_member_id: ws.member_id } } } }, { sent_by_user_id: ws.user_id }];
    }
    const and: Prisma.NotificationWhereInput[] = [];
    if (query.status) and.push({ status: query.status as any });
    if (query.type) and.push({ type: query.type as any });
    if (query.channel) and.push({ channel: query.channel as any });
    if (query.trigger) and.push({ trigger: query.trigger as any });
    if (query.client_id) and.push({ client_id: query.client_id });
    if (query.search) {
      and.push({
        OR: [
          { recipient_address: { contains: query.search, mode: 'insensitive' } },
          { recipient_name: { contains: query.search, mode: 'insensitive' } },
          { subject: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (and.length) where.AND = and;
    const [rows, total, statusCounts] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          client: { select: { id: true, first_name: true, last_name: true, company: true } },
          assignment: { select: { id: true, form: { select: { name: true } } } },
          sent_by: { select: { first_name: true, last_name: true, email: true } },
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.groupBy({ by: ['status'], where: { organization_id: ws.organization_id }, _count: true }),
    ]);
    return {
      ...paginate(rows.map((n) => this.map(n)), total, query.page, query.limit),
      counts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
    };
  }

  private map(n: any) {
    return {
      id: n.id,
      type: n.type,
      channel: n.channel,
      trigger: n.trigger,
      status: n.status,
      recipient_address: n.recipient_address,
      recipient_name: n.recipient_name,
      subject: n.subject,
      body: (n.body as string).split(SECURE_LINK_PLACEHOLDER).join('[secure link]'),
      client: n.client ? { id: n.client.id, name: `${n.client.first_name} ${n.client.last_name}`, company: n.client.company } : null,
      assignment: n.assignment ? { id: n.assignment.id, form_name: n.assignment.form.name } : null,
      sent_by: n.sent_by ? fullName(n.sent_by) || n.sent_by.email : null,
      provider: n.provider,
      provider_message_id: n.provider_message_id,
      provider_response: n.provider_response,
      failure_reason: n.failure_reason,
      attempt_count: n.attempt_count,
      scheduled_for: n.scheduled_for,
      sent_at: n.sent_at,
      delivered_at: n.delivered_at,
      failed_at: n.failed_at,
      created_at: n.created_at,
    };
  }

  async detail(ws: WorkspaceContext, id: string) {
    const n = await this.prisma.notification.findFirst({
      where: { id, organization_id: ws.organization_id },
      include: {
        client: { select: { id: true, first_name: true, last_name: true, company: true } },
        assignment: { select: { id: true, form: { select: { name: true } } } },
        sent_by: { select: { first_name: true, last_name: true, email: true } },
      },
    });
    if (!n) throw new NotFoundException('Notification not found');
    if (n.client_id && !this.access.canSeeAll(ws)) await this.access.assertClient(ws, n.client_id);
    const jobs = await this.prisma.jobRun.findMany({
      where: { entity_type: 'notification', entity_id: n.id },
      orderBy: [{ queued_at: 'asc' }, { attempt: 'asc' }],
    });
    return {
      ...this.map(n),
      jobs: jobs.map((j) => ({
        id: j.id,
        job_id: j.job_id,
        attempt: j.attempt,
        max_attempts: j.max_attempts,
        status: j.status,
        trigger: j.trigger,
        queued_at: j.queued_at,
        started_at: j.started_at,
        finished_at: j.finished_at,
        wait_ms: j.wait_ms,
        duration_ms: j.duration_ms,
        worker_id: j.worker_id,
        error_message: j.error_message,
      })),
    };
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async templates(organizationId: string) {
    const rows = await this.prisma.notificationTemplate.findMany({
      where: { organization_id: organizationId, deleted_at: null },
      orderBy: [{ type: 'asc' }, { is_default: 'desc' }, { name: 'asc' }],
    });
    return { data: rows, variables: TEMPLATE_VARIABLES };
  }

  async createTemplate(ws: WorkspaceContext, dto: CreateTemplateDto) {
    try {
      const template = await this.prisma.$transaction(async (tx) => {
        if (dto.is_default) {
          await tx.notificationTemplate.updateMany({
            where: { organization_id: ws.organization_id, type: dto.type, channel: dto.channel ?? NotificationChannel.EMAIL },
            data: { is_default: false },
          });
        }
        return tx.notificationTemplate.create({
          data: { organization_id: ws.organization_id, channel: NotificationChannel.EMAIL, ...dto },
        });
      });
      await this.audit(ws, 'notification_template.created', template.id, `Created template "${template.name}"`);
      return template;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A template with this name already exists');
      }
      throw error;
    }
  }

  async updateTemplate(ws: WorkspaceContext, id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.notificationTemplate.findFirst({ where: { id, organization_id: ws.organization_id, deleted_at: null } });
    if (!existing) throw new NotFoundException('Template not found');
    try {
      const template = await this.prisma.$transaction(async (tx) => {
        if (dto.is_default) {
          await tx.notificationTemplate.updateMany({
            where: { organization_id: ws.organization_id, type: dto.type ?? existing.type, channel: existing.channel, id: { not: id } },
            data: { is_default: false },
          });
        }
        return tx.notificationTemplate.update({ where: { id }, data: dto });
      });
      await this.audit(ws, 'notification_template.updated', id, `Updated template "${template.name}"`);
      return template;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A template with this name already exists');
      }
      throw error;
    }
  }

  async deleteTemplate(ws: WorkspaceContext, id: string) {
    const existing = await this.prisma.notificationTemplate.findFirst({ where: { id, organization_id: ws.organization_id, deleted_at: null } });
    if (!existing) throw new NotFoundException('Template not found');
    if (existing.is_system) throw new BadRequestException('Default templates can be edited but not deleted');
    await this.prisma.notificationTemplate.update({
      where: { id },
      data: { deleted_at: new Date(), is_default: false, name: `${existing.name} (deleted ${Date.now()})` },
    });
    await this.audit(ws, 'notification_template.deleted', id, `Deleted template "${existing.name}"`);
    return { success: true };
  }

  // ── Settings > Notifications ───────────────────────────────────────────────

  async settings(organizationId: string) {
    const [settings, rules, org] = await Promise.all([
      this.prisma.notificationSettings.findUnique({ where: { organization_id: organizationId }, include: { default_reminder_schedule: true } }),
      this.prisma.automationRule.findMany({ where: { organization_id: organizationId, form_id: null }, orderBy: { created_at: 'asc' } }),
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { time_zone: true } }),
    ]);
    if (!settings) throw new NotFoundException('Notification settings not found');
    const schedule = resolveSchedule([settings.default_reminder_schedule]);
    return {
      ...settings,
      time_zone: org.time_zone,
      default_reminder_schedule: { ...schedule, summary: describeSchedule(schedule) },
      automation_rules: rules,
      providers: this.providers.describe(),
    };
  }

  async updateSettings(ws: WorkspaceContext, dto: UpdateNotificationSettingsDto) {
    const settings = await this.prisma.notificationSettings.findUnique({ where: { organization_id: ws.organization_id } });
    if (!settings) throw new NotFoundException('Notification settings not found');
    if (dto.time_zone && !DateTime.local().setZone(dto.time_zone).isValid) throw new BadRequestException('Unknown time zone');
    if (dto.enabled_channels && !dto.enabled_channels.length) throw new BadRequestException('Keep at least one channel enabled');
    if (dto.enabled_channels?.includes(NotificationChannel.SMS)) throw new BadRequestException('SMS becomes available in a later release');

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationSettings.update({
        where: { id: settings.id },
        data: {
          enabled_channels: dto.enabled_channels,
          email_provider: dto.email_provider,
          sender_name: dto.sender_name,
          sender_email: dto.sender_email === '' ? null : dto.sender_email,
          auto_reminders_enabled: dto.auto_reminders_enabled,
          quiet_hours_start: dto.quiet_hours_start,
          quiet_hours_end: dto.quiet_hours_end,
          retry_max_attempts: dto.retry_max_attempts,
          retry_interval_minutes: dto.retry_interval_minutes,
        },
      });
      if (dto.default_reminder_schedule && settings.default_reminder_schedule_id) {
        // Changes apply to future reminders only; sent reminders are never resent.
        await tx.reminderSchedule.update({
          where: { id: settings.default_reminder_schedule_id },
          data: dto.default_reminder_schedule,
        });
      }
      for (const rule of dto.automation_rules ?? []) {
        const { id, ...data } = rule;
        await tx.automationRule.updateMany({ where: { id, organization_id: ws.organization_id }, data });
      }
      if (dto.time_zone) await tx.organization.update({ where: { id: ws.organization_id }, data: { time_zone: dto.time_zone } });
    });
    await this.audit(ws, 'settings.notifications_updated', settings.id, 'Updated notification settings');
    return this.settings(ws.organization_id);
  }

  private audit(ws: WorkspaceContext, action: string, entityId: string, description: string) {
    return this.activity.log({
      organizationId: ws.organization_id,
      action,
      entityType: 'notification_settings',
      entityId,
      actorUserId: ws.user_id,
      description,
    });
  }
}

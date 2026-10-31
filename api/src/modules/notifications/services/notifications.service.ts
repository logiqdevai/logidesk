import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import {
  JobQueue,
  JobTrigger,
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationTrigger,
  NotificationType,
  Prisma,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { JobsService } from '@/core/jobs/jobs.service';
import { JobNames } from '@/core/queues/queues.constants';
import { applyQuietHours, safeZone, zonedInstant } from '@/shared/utils/dates/dates.utils';
import { getDefaultTemplates } from '../utils/default-templates.constants';
import { languageForCountry } from '@/shared/i18n/language.utils';
import { renderTemplate } from '../utils/template.utils';

export const SECURE_LINK_PLACEHOLDER = '__SECURE_LINK__';

export interface NotifyInput {
  organizationId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  trigger?: NotificationTrigger;
  recipientAddress: string;
  recipientName?: string | null;
  clientId?: string | null;
  clientUserId?: string | null;
  /** Explicit email language for recipients without a client record (e.g. team invitations). */
  language?: string;
  assignmentId?: string | null;
  templateId?: string | null;
  automationRuleId?: string | null;
  sentByUserId?: string | null;
  variables?: Record<string, string | number | null | undefined>;
  /** Overrides (manual reminders let employees edit the message before sending). */
  subject?: string;
  body?: string;
  idempotencyKey?: string;
  /** Respect quiet hours (automatic sends). */
  respectQuietHours?: boolean;
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
  jobTrigger?: JobTrigger;
  parentJobRunId?: string;
}

/**
 * Provider-independent notification service. Modules call `notify()`; it renders the template,
 * writes a PENDING `notifications` row with an idempotency key and enqueues delivery on the
 * NOTIFICATIONS queue. Nothing is sent inside the calling request.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly config: ConfigService,
  ) {}

  appUrl(): string {
    return (this.config.get<string>('APP_URL') || 'http://localhost:5173').replace(/\/$/, '');
  }

  portalUrl(): string {
    return `${this.appUrl()}/portal`;
  }

  async getSettings(organizationId: string) {
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { organization_id: organizationId },
      include: { default_reminder_schedule: true },
    });
    if (!settings) throw new NotFoundException('Notification settings not found');
    return settings;
  }

  /** Language for a client's emails, from their country; `undefined` falls back to the organization's language. */
  private async clientLanguage(clientId?: string | null) {
    if (!clientId) return undefined;
    const client = await this.prisma.client.findUnique({ where: { id: clientId }, select: { country: true } });
    return languageForCountry(client?.country);
  }

  /**
   * Picks the template. When `language` differs from the organization's, built-in and unedited seeded templates
   * are swapped for their translation; templates the organization customised are sent as written.
   */
  async resolveTemplate(organizationId: string, type: NotificationType, channel: NotificationChannel, templateId?: string | null, language?: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { default_language: true } });
    const orgLanguage = org?.default_language;
    const translated = language && language !== orgLanguage ? getDefaultTemplates(language).templates.find((t) => t.type === type) : undefined;

    let template = templateId
      ? await this.prisma.notificationTemplate.findFirst({ where: { id: templateId, organization_id: organizationId, deleted_at: null } })
      : null;
    template ??= await this.prisma.notificationTemplate.findFirst({
      where: { organization_id: organizationId, type, channel, deleted_at: null },
      orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }],
    });
    if (template) {
      const seeded = getDefaultTemplates(orgLanguage).templates.find((t) => t.type === type);
      const unedited = seeded && template.subject === seeded.subject && template.body === seeded.body;
      return translated && unedited ? { id: template.id, subject: translated.subject, body: translated.body } : template;
    }
    const { templates } = getDefaultTemplates(language ?? orgLanguage);
    const fallback = templates.find((t) => t.type === type) ?? templates[1];
    return { id: null, subject: fallback.subject, body: fallback.body };
  }

  /** Renders a template for previews (manual reminders) without persisting anything. */
  async render(
    organizationId: string,
    type: NotificationType,
    variables: Record<string, string | number | null | undefined>,
    channel: NotificationChannel = NotificationChannel.EMAIL,
    clientId?: string | null,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const template = await this.resolveTemplate(organizationId, type, channel, null, await this.clientLanguage(clientId));
    const vars = { company_name: org?.name, ...variables };
    return {
      template_id: template.id,
      subject: renderTemplate(template.subject ?? '', vars),
      body: renderTemplate(template.body, vars),
    };
  }

  async notify(input: NotifyInput): Promise<Notification | null> {
    const channel = input.channel ?? NotificationChannel.EMAIL;
    const [org, settings] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: input.organizationId }, select: { name: true, time_zone: true } }),
      this.getSettings(input.organizationId),
    ]);
    if (!settings.enabled_channels.includes(channel)) {
      this.logger.debug(`Channel ${channel} disabled for ${input.organizationId}; skipping ${input.type}`);
      return null;
    }
    if (!input.recipientAddress) return null;

    const template = await this.resolveTemplate(input.organizationId, input.type, channel, input.templateId, input.language ?? (await this.clientLanguage(input.clientId)));
    const variables = { company_name: org.name, ...(input.variables ?? {}) };
    const subject = renderTemplate(input.subject ?? template.subject ?? '', variables);
    const body = renderTemplate(input.body ?? template.body, variables);

    let scheduledFor = input.scheduledFor ?? null;
    if (input.respectQuietHours && settings.quiet_hours_start && settings.quiet_hours_end) {
      const zone = safeZone(org.time_zone);
      const now = DateTime.now().setZone(zone);
      const nowHm = now.toFormat('HH:mm');
      const adjusted = applyQuietHours(nowHm, settings.quiet_hours_start, settings.quiet_hours_end);
      if (adjusted !== nowHm) {
        let at = zonedInstant(now.toISODate(), adjusted, zone);
        if (at.getTime() < Date.now()) at = zonedInstant(now.plus({ days: 1 }).toISODate(), adjusted, zone);
        scheduledFor = at;
      }
    }

    let notification: Notification;
    try {
      notification = await this.prisma.notification.create({
        data: {
          organization_id: input.organizationId,
          channel,
          type: input.type,
          trigger: input.trigger ?? NotificationTrigger.AUTOMATIC,
          recipient_address: input.recipientAddress,
          recipient_name: input.recipientName ?? null,
          client_id: input.clientId ?? null,
          client_user_id: input.clientUserId ?? null,
          assignment_id: input.assignmentId ?? null,
          template_id: template.id ?? null,
          automation_rule_id: input.automationRuleId ?? null,
          sent_by_user_id: input.sentByUserId ?? null,
          subject,
          body,
          idempotency_key: input.idempotencyKey ?? null,
          status: NotificationStatus.PENDING,
          scheduled_for: scheduledFor,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.debug(`Duplicate notification suppressed (${input.idempotencyKey})`);
        return null;
      }
      throw error;
    }

    await this.enqueueDelivery(notification, settings, {
      trigger: input.jobTrigger ?? (input.trigger === NotificationTrigger.MANUAL ? JobTrigger.API_REQUEST : JobTrigger.SYSTEM),
      triggeredByUserId: input.sentByUserId ?? undefined,
      parentJobRunId: input.parentJobRunId,
      jobKey: `notification-${notification.id}`,
    });
    return notification;
  }

  private async enqueueDelivery(
    notification: Notification,
    settings: { retry_max_attempts: number; retry_interval_minutes: number },
    options: { trigger: JobTrigger; triggeredByUserId?: string; parentJobRunId?: string; jobKey: string },
  ) {
    const delayMs = notification.scheduled_for ? notification.scheduled_for.getTime() - Date.now() : 0;
    await this.jobs.enqueue({
      queue: JobQueue.NOTIFICATIONS,
      name: JobNames.NOTIFICATION_DELIVER,
      jobId: options.jobKey,
      data: { notification_id: notification.id },
      organizationId: notification.organization_id,
      trigger: options.trigger,
      triggeredByUserId: options.triggeredByUserId,
      parentJobRunId: options.parentJobRunId,
      entityType: 'notification',
      entityId: notification.id,
      delayMs: Math.max(0, delayMs),
      attempts: Math.max(1, settings.retry_max_attempts),
      backoffMs: Math.max(1, settings.retry_interval_minutes) * 60_000,
    });
  }

  /** "Retry" on the Notifications page: new delivery job with trigger Manual retry. */
  async retry(organizationId: string, notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, organization_id: organizationId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.status !== NotificationStatus.FAILED && notification.status !== NotificationStatus.CANCELLED) {
      throw new BadRequestException('Only failed or cancelled notifications can be retried');
    }
    const settings = await this.getSettings(organizationId);
    const retries = await this.prisma.jobRun.count({
      where: { entity_type: 'notification', entity_id: notification.id, trigger: JobTrigger.MANUAL_RETRY, attempt: 1 },
    });
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: NotificationStatus.PENDING, failure_reason: null, failed_at: null, cancelled_at: null, scheduled_for: null },
    });
    await this.enqueueDelivery(updated, settings, {
      trigger: JobTrigger.MANUAL_RETRY,
      triggeredByUserId: userId,
      jobKey: `notification-${notification.id}-retry-${retries + 1}`,
    });
    return updated;
  }
}

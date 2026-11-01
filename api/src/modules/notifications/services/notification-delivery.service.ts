import { Injectable, Logger } from '@nestjs/common';
import { InvitationStatus, NotificationStatus, NotificationType, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { NotificationProvidersService } from '@/integrations/notifications/providers/notification-providers.service';
import { generateToken, sha256 } from '@/shared/utils/crypto/crypto.utils';
import { ActivityService } from '@/modules/activity/activity.service';
import { normalizeAppName } from '@/shared/constants/app';
import { textToHtml } from '../utils/template.utils';
import { NotificationsService, SECURE_LINK_PLACEHOLDER } from './notifications.service';

const CLIENT_REMINDER_TYPES: NotificationType[] = [
  NotificationType.MISSING_DOCUMENTS,
  NotificationType.EXPIRING_DOCUMENTS,
  NotificationType.EXPIRED_DOCUMENTS,
  NotificationType.MANUAL_REMINDER,
];
const CLIENT_REVIEW_TYPES: NotificationType[] = [NotificationType.DOCUMENT_APPROVED, NotificationType.DOCUMENT_REJECTED];

/** Worker-side delivery of one notification over its channel (`notification.deliver`). */
@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: NotificationProvidersService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  async deliver(notificationId: string, attempt: number, maxAttempts: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        organization: { select: { name: true, portal_settings: { select: { accent_color: true } } } },
        client_user: true,
      },
    });
    if (!notification) return { skipped: 'not_found' };
    if (
      notification.status === NotificationStatus.SENT ||
      notification.status === NotificationStatus.DELIVERED ||
      notification.status === NotificationStatus.CANCELLED
    ) {
      return { skipped: notification.status };
    }

    // Respect the client's own portal preferences.
    const prefs = notification.client_user;
    if (
      prefs &&
      ((CLIENT_REMINDER_TYPES.includes(notification.type) && !prefs.notify_reminders) ||
        (CLIENT_REVIEW_TYPES.includes(notification.type) && !prefs.notify_review_updates))
    ) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.CANCELLED, cancelled_at: new Date(), failure_reason: 'Client opted out of this email' },
      });
      return { skipped: 'opted_out' };
    }

    const settings = await this.notifications.getSettings(notification.organization_id);
    // Bodies saved before a rename still carry the legacy product name.
    let text = normalizeAppName(notification.body);
    const metadata = (notification.metadata ?? {}) as Record<string, any>;

    if (text.includes(SECURE_LINK_PLACEHOLDER)) {
      const link = await this.issueSecureLink(metadata);
      text = text.split(SECURE_LINK_PLACEHOLDER).join(link);
    }

    try {
      const provider = this.providers.resolve(notification.channel, settings.email_provider);
      const result = await provider.send({
        to: notification.recipient_address,
        toName: notification.recipient_name,
        fromName: settings.sender_name || notification.organization.name,
        replyTo: settings.sender_email,
        subject: normalizeAppName(notification.subject),
        text,
        html: textToHtml(text, {
          organizationName: notification.organization.name,
          accentColor: notification.organization.portal_settings?.accent_color,
        }),
        idempotencyKey: notification.idempotency_key ?? notification.id,
      });
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sent_at: new Date(),
          provider: result.provider,
          provider_message_id: result.providerMessageId ?? null,
          provider_response: (result.response ?? undefined) as Prisma.InputJsonValue,
          attempt_count: { increment: 1 },
          failure_reason: null,
          next_retry_at: null,
        },
      });
      if (metadata.invitation_id) {
        await this.prisma.invitation.updateMany({
          where: { id: metadata.invitation_id },
          data: { last_sent_at: new Date() },
        });
      }
      return { status: 'SENT', provider: result.provider, provider_message_id: result.providerMessageId };
    } catch (error) {
      const last = attempt >= maxAttempts;
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          attempt_count: { increment: 1 },
          failure_reason: String(error.message).slice(0, 1000),
          provider_response: (error.providerResponse ?? undefined) as Prisma.InputJsonValue,
          ...(last
            ? { status: NotificationStatus.FAILED, failed_at: new Date(), next_retry_at: null }
            : { next_retry_at: new Date(Date.now() + settings.retry_interval_minutes * 60_000 * Math.pow(2, attempt - 1)) }),
        },
      });
      if (last) {
        await this.activity.log({
          organizationId: notification.organization_id,
          action: 'notification.failed',
          entityType: 'notification',
          entityId: notification.id,
          clientId: notification.client_id,
          assignmentId: notification.assignment_id,
          description: `Notification to ${notification.recipient_address} failed: ${error.message}`,
        });
      }
      throw error;
    }
  }

  /**
   * Invitation links are generated at delivery time (and rotated on every resend) so the raw
   * token never sits in the database, job payloads or notification history.
   */
  private async issueSecureLink(metadata: Record<string, any>): Promise<string> {
    if (!metadata.invitation_id) return this.notifications.portalUrl();
    const invitation = await this.prisma.invitation.findUnique({ where: { id: metadata.invitation_id } });
    if (!invitation || invitation.status !== InvitationStatus.PENDING) return this.notifications.portalUrl();
    const token = generateToken();
    await this.prisma.invitation.update({ where: { id: invitation.id }, data: { token_hash: sha256(token) } });
    return `${this.notifications.appUrl()}/auth?invite=${encodeURIComponent(token)}`;
  }

  /** Provider delivery webhooks (Resend events). */
  async applyProviderEvent(providerMessageId: string, event: 'delivered' | 'failed', reason?: string) {
    const notification = await this.prisma.notification.findFirst({ where: { provider_message_id: providerMessageId } });
    if (!notification) return;
    if (event === 'delivered') {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.DELIVERED, delivered_at: new Date() },
      });
    } else {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.FAILED, failed_at: new Date(), failure_reason: reason ?? 'Provider reported failure' },
      });
    }
  }
}

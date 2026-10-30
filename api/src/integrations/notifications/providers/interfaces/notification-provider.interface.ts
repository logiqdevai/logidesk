import { NotificationChannel } from 'generated/prisma';

export interface OutgoingMessage {
  to: string;
  toName?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  subject?: string | null;
  text: string;
  html?: string | null;
  /** Used for provider-side de-duplication where supported. */
  idempotencyKey?: string;
}

export interface DeliveryResult {
  provider: string;
  providerMessageId?: string | null;
  /** True when the provider will report delivery receipts through webhooks. */
  reportsDelivery: boolean;
  response?: Record<string, unknown>;
}

/**
 * A channel provider (email, SMS, later WhatsApp/push). Each provider owns authentication,
 * delivery and error handling; it throws on failure so the queue retries with backoff.
 */
export interface NotificationProvider {
  readonly name: string;
  readonly channel: NotificationChannel;
  isConfigured(): boolean;
  send(message: OutgoingMessage): Promise<DeliveryResult>;
}

export const NOTIFICATION_PROVIDERS = 'NOTIFICATION_PROVIDERS';

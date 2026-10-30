import { Resend } from 'resend';
import { NotificationChannel } from 'generated/prisma';
import { DeliveryResult, NotificationProvider, OutgoingMessage } from '../interfaces/notification-provider.interface';

export class ResendEmailProvider implements NotificationProvider {
  readonly name = 'resend';
  readonly channel = NotificationChannel.EMAIL;
  private readonly client: Resend | null;

  constructor(
    apiKey: string | undefined,
    private readonly fromAddress: string,
  ) {
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async send(message: OutgoingMessage): Promise<DeliveryResult> {
    if (!this.client) throw new Error('Resend is not configured (RESEND_API_KEY missing)');
    const from = message.fromName ? `${message.fromName.replace(/[<>"]/g, '')} <${this.fromAddress}>` : this.fromAddress;
    const { data, error } = await this.client.emails.send(
      {
        from,
        to: message.to,
        subject: message.subject ?? '',
        text: message.text,
        html: message.html ?? undefined,
        replyTo: message.replyTo ?? undefined,
      },
      message.idempotencyKey ? { idempotencyKey: message.idempotencyKey.slice(0, 256) } : undefined,
    );
    if (error) {
      const err = new Error(`Resend rejected the message: ${error.message}`);
      (err as any).providerResponse = error;
      throw err;
    }
    return { provider: this.name, providerMessageId: data?.id, reportsDelivery: true, response: { id: data?.id } };
  }
}

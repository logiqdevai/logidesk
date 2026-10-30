import * as nodemailer from 'nodemailer';
import { NotificationChannel } from 'generated/prisma';
import { DeliveryResult, NotificationProvider, OutgoingMessage } from '../interfaces/notification-provider.interface';

export interface SmtpOptions {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  secure?: boolean;
  from?: string;
}

export class SmtpEmailProvider implements NotificationProvider {
  readonly name = 'smtp';
  readonly channel = NotificationChannel.EMAIL;
  private readonly transport: nodemailer.Transporter | null;

  constructor(private readonly options: SmtpOptions) {
    this.transport = options.host
      ? nodemailer.createTransport({
          host: options.host,
          port: options.port ?? 587,
          secure: options.secure ?? false,
          auth: options.user ? { user: options.user, pass: options.password } : undefined,
        })
      : null;
  }

  isConfigured(): boolean {
    return !!this.transport && !!this.options.from;
  }

  async send(message: OutgoingMessage): Promise<DeliveryResult> {
    if (!this.transport) throw new Error('SMTP is not configured (SMTP_HOST missing)');
    const info = await this.transport.sendMail({
      from: message.fromName ? { name: message.fromName, address: this.options.from } : this.options.from,
      to: message.to,
      replyTo: message.replyTo ?? undefined,
      subject: message.subject ?? '',
      text: message.text,
      html: message.html ?? undefined,
    });
    return {
      provider: this.name,
      providerMessageId: info.messageId,
      reportsDelivery: false,
      response: { accepted: info.accepted, response: info.response },
    };
  }
}

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { NotificationChannel } from 'generated/prisma';
import { DeliveryResult, NotificationProvider, OutgoingMessage } from '../interfaces/notification-provider.interface';

/**
 * Development-only email provider: writes each message to a local outbox directory
 * (`EMAIL_OUTBOX_DIR`, default `.outbox`) instead of sending it. It is never selected in
 * production; there a missing provider makes deliveries fail visibly.
 */
export class OutboxEmailProvider implements NotificationProvider {
  readonly name = 'outbox';
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger('EmailOutbox');
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = resolve(dir);
  }

  isConfigured(): boolean {
    return true;
  }

  async send(message: OutgoingMessage): Promise<DeliveryResult> {
    const id = randomUUID();
    await fs.mkdir(this.dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(this.dir, `${stamp}_${message.to.replace(/[^\w.@-]/g, '_')}.html`);
    const header = `<!-- to: ${message.to} | subject: ${message.subject ?? ''} | id: ${id} -->\n`;
    await fs.writeFile(file, header + (message.html ?? `<pre>${message.text}</pre>`));
    await fs.appendFile(
      join(this.dir, 'outbox.log'),
      JSON.stringify({ id, at: new Date().toISOString(), to: message.to, subject: message.subject, text: message.text }) + '\n',
    );
    this.logger.log(`Email to ${message.to} written to outbox: "${message.subject}"`);
    return { provider: this.name, providerMessageId: id, reportsDelivery: false, response: { file } };
  }
}

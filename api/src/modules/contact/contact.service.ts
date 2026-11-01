import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from 'generated/prisma';
import { NotificationProvidersService } from '@/integrations/notifications/providers/notification-providers.service';
import { EmailConfig } from '@/shared/config/email';
import { APP_NAME } from '@/shared/constants/app';
import { textToHtml } from '@/modules/notifications/utils/template.utils';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly providers: NotificationProvidersService,
    private readonly config: ConfigService,
  ) {}

  /** Emails the contact message to the support inbox; replies go straight to the sender. */
  async send(dto: ContactDto) {
    const to = this.config.get<string>('CONTACT_EMAIL') || EmailConfig.default_from;
    const text = `New contact message\n\nName: ${dto.name}\nEmail: ${dto.email}\n${dto.phone ? `Phone: ${dto.phone}\n` : ''}Topic: ${dto.topic}\nSubject: ${dto.subject}\n\n${dto.message}`;
    // Header values must not contain line breaks.
    const subject = `[Support: ${dto.topic}] ${dto.subject.replace(/[\r\n]+/g, ' ')}`;
    const provider = this.providers.resolve(NotificationChannel.EMAIL);
    await provider.send({
      to,
      subject,
      text,
      html: textToHtml(text, { organizationName: APP_NAME, language: 'en' }),
      fromName: `${APP_NAME} Support`,
      replyTo: dto.email,
    });
    return { success: true };
  }
}

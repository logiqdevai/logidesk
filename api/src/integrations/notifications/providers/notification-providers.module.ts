import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailConfig } from '@/shared/config/email';
import { NOTIFICATION_PROVIDERS, NotificationProvider } from './interfaces/notification-provider.interface';
import { ResendEmailProvider } from './email/resend-email.provider';
import { SmtpEmailProvider } from './email/smtp-email.provider';
import { OutboxEmailProvider } from './email/outbox-email.provider';
import { NotificationProvidersService } from './notification-providers.service';

@Global()
@Module({
  providers: [
    {
      provide: NOTIFICATION_PROVIDERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): NotificationProvider[] => {
        const providers: NotificationProvider[] = [
          new ResendEmailProvider(
            config.get('RESEND_API_KEY') || undefined,
            config.get('EMAIL_FROM') || EmailConfig.default_from,
          ),
          new SmtpEmailProvider({
            host: config.get('SMTP_HOST') || undefined,
            port: config.get('SMTP_PORT') ? Number(config.get('SMTP_PORT')) : undefined,
            user: config.get('SMTP_USER') || undefined,
            password: config.get('SMTP_PASSWORD') || undefined,
            secure: config.get('SMTP_SECURE') === 'true',
            from: config.get('SMTP_FROM') || config.get('EMAIL_FROM') || undefined,
          }),
        ];
        // SMS (Twilio) is added here in Phase 2 behind the same interface.
        if (config.get('NODE_ENV') !== 'production') {
          providers.push(new OutboxEmailProvider(config.get('EMAIL_OUTBOX_DIR') || '.outbox'));
        }
        return providers;
      },
    },
    NotificationProvidersService,
  ],
  exports: [NotificationProvidersService],
})
export class NotificationProvidersModule {}

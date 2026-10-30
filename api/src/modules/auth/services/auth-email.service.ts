import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { NotificationProvidersService } from '@/integrations/notifications/providers/notification-providers.service';
import { generateToken, sha256 } from '@/shared/utils/crypto/crypto.utils';
import { textToHtml } from '@/modules/notifications/utils/template.utils';

/**
 * Account emails (verification, password reset) that do not belong to an organization.
 * Runs in the worker (`auth.email` on NOTIFICATIONS). The token is created here so it never
 * appears in a job payload.
 */
@Injectable()
export class AuthEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: NotificationProvidersService,
    private readonly config: ConfigService,
  ) {}

  private appUrl() {
    return (this.config.get<string>('APP_URL') || 'http://localhost:5173').replace(/\/$/, '');
  }

  async send(userId: string, kind: 'verify_email' | 'reset_password') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deleted_at) return { skipped: 'user_not_found' };
    const token = generateToken();
    let subject: string;
    let text: string;
    if (kind === 'verify_email') {
      if (user.email_verified_at) return { skipped: 'already_verified' };
      await this.prisma.emailVerificationToken.create({
        data: { user_id: user.id, email: user.email, token_hash: sha256(token), expires_at: new Date(Date.now() + 3 * 86_400_000) },
      });
      subject = 'Verify your email address';
      text = `Hi ${user.first_name ?? ''},\n\nPlease confirm your email address to finish setting up your Gatherly account.\n\n${this.appUrl()}/auth/verify-email?token=${encodeURIComponent(token)}\n\nThe link expires in 3 days.`;
    } else {
      await this.prisma.passwordResetToken.create({
        data: { user_uuid: user.id, token_hash: sha256(token), expires_at: new Date(Date.now() + 60 * 60_000) },
      });
      subject = 'Reset your password';
      text = `Hi ${user.first_name ?? ''},\n\nWe received a request to reset your Gatherly password. Choose a new one here:\n\n${this.appUrl()}/auth/reset-password?token=${encodeURIComponent(token)}\n\nThe link expires in 1 hour. If you did not ask for this, you can ignore this email.`;
    }
    const provider = this.providers.resolve(NotificationChannel.EMAIL);
    const result = await provider.send({
      to: user.email,
      subject,
      text,
      html: textToHtml(text, { organizationName: 'Gatherly' }),
      fromName: 'Gatherly',
    });
    return { provider: result.provider, provider_message_id: result.providerMessageId };
  }
}

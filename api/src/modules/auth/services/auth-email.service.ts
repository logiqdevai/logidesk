import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitationStatus, NotificationChannel } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { NotificationProvidersService } from '@/integrations/notifications/providers/notification-providers.service';
import { generateToken, sha256 } from '@/shared/utils/crypto/crypto.utils';
import { APP_NAME } from '@/shared/constants/app';
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

  /** Admin-sent platform invitation. The link is minted here so the raw token never sits in a job payload. */
  async sendPlatformInvitation(invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { invited_by: { select: { first_name: true, last_name: true, email: true, language: true } } },
    });
    if (!invitation || invitation.status !== InvitationStatus.PENDING) return { skipped: 'invitation_not_pending' };
    const token = generateToken();
    await this.prisma.invitation.update({ where: { id: invitation.id }, data: { token_hash: sha256(token) } });
    const link = `${this.appUrl()}/auth?invite=${encodeURIComponent(token)}`;
    const el = invitation.invited_by?.language === 'el';
    const inviter = [invitation.invited_by?.first_name, invitation.invited_by?.last_name].filter(Boolean).join(' ') || invitation.invited_by?.email || APP_NAME;
    const note = invitation.message ? `

${invitation.message}` : '';
    const subject = el ? `Προσκλήθηκατε στο ${APP_NAME}` : `You're invited to ${APP_NAME}`;
    const text = el
      ? `Γεια σας,

Ο/Η ${inviter} σας προσκάλεσε να δημιουργήσετε λογαριασμό στο ${APP_NAME}.${note}

Δημιουργήστε τον λογαριασμό σας:
${link}

Ο σύνδεσμος λήγει σε 7 ημέρες.`
      : `Hi,

${inviter} invited you to create an account on ${APP_NAME}.${note}

Create your account:
${link}

The link expires in 7 days.`;
    const provider = this.providers.resolve(NotificationChannel.EMAIL);
    const result = await provider.send({
      to: invitation.email,
      subject,
      text,
      html: textToHtml(text, { organizationName: APP_NAME, language: el ? 'el' : 'en' }),
      fromName: APP_NAME,
    });
    await this.prisma.invitation.update({ where: { id: invitation.id }, data: { last_sent_at: new Date() } });
    return { provider: result.provider, provider_message_id: result.providerMessageId };
  }

  async send(userId: string, kind: 'verify_email' | 'reset_password') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deleted_at) return { skipped: 'user_not_found' };
    const token = generateToken();
    const el = user.language === 'el';
    const verifyLink = `${this.appUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
    const resetLink = `${this.appUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    let subject: string;
    let text: string;
    if (kind === 'verify_email') {
      if (user.email_verified_at) return { skipped: 'already_verified' };
      await this.prisma.emailVerificationToken.create({
        data: { user_id: user.id, email: user.email, token_hash: sha256(token), expires_at: new Date(Date.now() + 3 * 86_400_000) },
      });
      subject = el ? 'Επιβεβαιώστε τη διεύθυνση email σας' : 'Verify your email address';
      text = el
        ? `Γεια σας ${user.first_name ?? ''},\n\nΠαρακαλούμε επιβεβαιώστε τη διεύθυνση email σας για να ολοκληρώσετε τη ρύθμιση του λογαριασμού σας στο ${APP_NAME}.\n\n${verifyLink}\n\nΟ σύνδεσμος λήγει σε 3 ημέρες.`
        : `Hi ${user.first_name ?? ''},\n\nPlease confirm your email address to finish setting up your ${APP_NAME} account.\n\n${verifyLink}\n\nThe link expires in 3 days.`;
    } else {
      await this.prisma.passwordResetToken.create({
        data: { user_uuid: user.id, token_hash: sha256(token), expires_at: new Date(Date.now() + 60 * 60_000) },
      });
      subject = el ? 'Επαναφορά του κωδικού πρόσβασής σας' : 'Reset your password';
      text = el
        ? `Γεια σας ${user.first_name ?? ''},\n\nΛάβαμε αίτημα επαναφοράς του κωδικού πρόσβασής σας στο ${APP_NAME}. Επιλέξτε νέο κωδικό εδώ:\n\n${resetLink}\n\nΟ σύνδεσμος λήγει σε 1 ώρα. Αν δεν κάνατε εσείς το αίτημα, μπορείτε να αγνοήσετε αυτό το email.`
        : `Hi ${user.first_name ?? ''},\n\nWe received a request to reset your ${APP_NAME} password. Choose a new one here:\n\n${resetLink}\n\nThe link expires in 1 hour. If you did not ask for this, you can ignore this email.`;
    }
    const provider = this.providers.resolve(NotificationChannel.EMAIL);
    const result = await provider.send({
      to: user.email,
      subject,
      text,
      html: textToHtml(text, { organizationName: APP_NAME, language: el ? 'el' : 'en' }),
      fromName: APP_NAME,
    });
    return { provider: result.provider, provider_message_id: result.providerMessageId };
  }
}

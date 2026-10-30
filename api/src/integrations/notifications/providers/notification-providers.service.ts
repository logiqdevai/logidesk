import { Inject, Injectable } from '@nestjs/common';
import { EmailProvider, NotificationChannel } from 'generated/prisma';
import { NOTIFICATION_PROVIDERS, NotificationProvider } from './interfaces/notification-provider.interface';

/** Resolves the provider for a channel (and the organization's preferred email provider). */
@Injectable()
export class NotificationProvidersService {
  constructor(@Inject(NOTIFICATION_PROVIDERS) private readonly providers: NotificationProvider[]) {}

  resolve(channel: NotificationChannel, preferredEmail?: EmailProvider | null): NotificationProvider {
    const candidates = this.providers.filter((p) => p.channel === channel && p.isConfigured());
    if (channel === NotificationChannel.EMAIL && preferredEmail) {
      const preferred = candidates.find((p) => p.name === preferredEmail.toLowerCase());
      if (preferred) return preferred;
    }
    const provider = candidates[0];
    if (!provider) {
      throw new Error(`No ${channel.toLowerCase()} provider is configured`);
    }
    return provider;
  }

  describe() {
    return this.providers.map((p) => ({ name: p.name, channel: p.channel, configured: p.isConfigured() }));
  }
}

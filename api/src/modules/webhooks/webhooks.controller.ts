import { BadRequestException, Body, Controller, Headers, HttpCode, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { NotificationDeliveryService } from '@/modules/notifications/services/notification-delivery.service';

/** Provider delivery webhooks (Resend events → Delivered / Failed). */
@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly cache: AppCacheService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  @Post('resend')
  @HttpCode(200)
  async resend(
    @Req() req: any,
    @Body() body: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Webhook secret not configured');
    const raw: Buffer | undefined = req.rawBody;
    if (!raw || !svixId || !svixTimestamp || !svixSignature) throw new UnauthorizedException();
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = createHmac('sha256', key).update(`${svixId}.${svixTimestamp}.${raw.toString('utf8')}`).digest('base64');
    const valid = svixSignature
      .split(' ')
      .map((s) => s.split(',')[1])
      .some((sig) => sig && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
    if (!valid || Math.abs(Date.now() / 1000 - Number(svixTimestamp)) > 300) throw new UnauthorizedException();

    // De-duplicate provider retries.
    const fresh = await this.cache.acquireLock(`webhook:resend:${svixId}`, 24 * 3_600_000);
    if (!fresh) return { duplicate: true };

    const messageId = body?.data?.email_id;
    if (!messageId) return { ignored: true };
    if (body.type === 'email.delivered') await this.delivery.applyProviderEvent(messageId, 'delivered');
    if (body.type === 'email.bounced' || body.type === 'email.complained' || body.type === 'email.failed') {
      await this.delivery.applyProviderEvent(messageId, 'failed', body?.data?.bounce?.message ?? body.type);
    }
    this.logger.log(`Resend event ${body.type} for ${messageId}`);
    return { received: true };
  }
}

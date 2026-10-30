import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppCacheService } from '@/core/cache/app-cache.service';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  /** Bucket name (endpoint group). */
  name: string;
  limit: number;
  windowSeconds: number;
  /** Also count per submitted email (login throttling across IPs). */
  byEmail?: boolean;
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/** Redis-backed fixed-window limiter, shared by all API instances. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: AppCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true;
    const request = context.switchToHttp().getRequest();
    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip || 'unknown';

    const keys = [`${options.name}:ip:${ip}`];
    const email = typeof request.body?.email === 'string' ? request.body.email.toLowerCase().trim() : null;
    if (options.byEmail && email) keys.push(`${options.name}:email:${email}`);

    for (const key of keys) {
      const count = await this.cache.hit(key, options.windowSeconds);
      if (count > options.limit) {
        throw new HttpException(
          { message: 'Too many attempts. Please wait a few minutes and try again.', code: 'rate_limited' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    return true;
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../databases/redis/redis.constants';

const PREFIX = 'logidesk:cache:';

/**
 * Short-lived Redis caches (dashboard counters, inbox badge, storage usage) and distributed
 * locks. Redis is never the system of record: a cache miss always recomputes from Postgres.
 */
@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getOrSet<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redis.get(PREFIX + key);
      if (cached) return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.warn(`cache read failed for ${key}: ${error.message}`);
    }
    const value = await compute();
    try {
      await this.redis.set(PREFIX + key, JSON.stringify(value, bigintReplacer), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`cache write failed for ${key}: ${error.message}`);
    }
    return value;
  }

  async invalidate(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      await this.redis.del(...keys.map((k) => PREFIX + k));
    } catch (error) {
      this.logger.warn(`cache invalidate failed: ${error.message}`);
    }
  }

  /** Invalidates all organization-scoped caches that depend on document/assignment state. */
  async invalidateOrganization(organizationId: string): Promise<void> {
    await this.invalidate(
      CacheKeys.dashboard(organizationId),
      CacheKeys.storage(organizationId),
      CacheKeys.inboxCount(organizationId),
    );
    try {
      const keys = await this.redis.keys(`${PREFIX}${CacheKeys.memberScoped(organizationId)}*`);
      if (keys.length) await this.redis.del(...keys);
    } catch {
      // best effort
    }
  }

  /** Distributed lock (SET NX PX). Returns a release function or null when already held. */
  async acquireLock(name: string, ttlMs: number): Promise<(() => Promise<void>) | null> {
    const key = `logidesk:lock:${name}`;
    const token = `${process.pid}:${Date.now()}:${Math.random()}`;
    const ok = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    if (!ok) return null;
    return async () => {
      const current = await this.redis.get(key);
      if (current === token) await this.redis.del(key);
    };
  }

  /** Fixed-window counter used by the rate limiter. */
  async hit(key: string, windowSeconds: number): Promise<number> {
    const full = `logidesk:rl:${key}`;
    const count = await this.redis.incr(full);
    if (count === 1) await this.redis.expire(full, windowSeconds);
    return count;
  }

  async rawSet(key: string, value: string, ttlSeconds: number) {
    await this.redis.set(PREFIX + key, value, 'EX', ttlSeconds);
  }
}

export const CacheKeys = {
  dashboard: (orgId: string) => `org:${orgId}:dashboard`,
  storage: (orgId: string) => `org:${orgId}:storage`,
  inboxCount: (orgId: string) => `org:${orgId}:inbox-count`,
  memberScoped: (orgId: string) => `org:${orgId}:member:`,
  memberDashboard: (orgId: string, memberId: string) => `org:${orgId}:member:${memberId}:dashboard`,
  memberInboxCount: (orgId: string, memberId: string) => `org:${orgId}:member:${memberId}:inbox-count`,
  memberStorage: (orgId: string, memberId: string) => `org:${orgId}:member:${memberId}:storage`,
  membership: (orgId: string, userId: string) => `membership:${orgId}:${userId}`,
};

function bigintReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? Number(value) : value;
}

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis, { type RedisOptions } from 'ioredis';
import { REDIS_CLIENT, REDIS_OPTIONS } from './redis.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_OPTIONS,
      useFactory: (configService: ConfigService): RedisOptions | null => {
        const logger = new Logger('RedisModule');

        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          logger.warn('REDIS not initialized');
          return null;
        }

        const url = new URL(redisUrl);
        const db = parseInt(url.pathname.replace('/', ''), 10);
        return {
          host: url.hostname,
          port: parseInt(url.port, 10) || 6379,
          password: url.password ? decodeURIComponent(url.password) : undefined,
          username: url.username || undefined,
          db: Number.isFinite(db) ? db : 0,
          tls: url.protocol === 'rediss:' ? {} : undefined,
          maxRetriesPerRequest: null,
        };
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_CLIENT,
      useFactory: (options: RedisOptions | null): Redis => {
        if (!options) {
          throw new Error('REDIS_URL is required (queues, locks, rate limiting, caches)');
        }
        return new Redis(options);
      },
      inject: [REDIS_OPTIONS],
    },
  ],
  exports: [REDIS_OPTIONS, REDIS_CLIENT],
})
export class RedisModule {}

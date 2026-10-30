import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from 'generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

/**
 * Prisma client. Tenant isolation is enforced twice:
 * 1. every service query is scoped by `organization_id` taken from the authenticated context;
 * 2. Postgres row-level security (see the `row_level_security` migration) filters on the
 *    `app.current_organization_id` setting. Use `withTenant()` to run a unit of work with the
 *    settings applied (required when the API connects with a role that does not bypass RLS).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get('DATABASE_URL') as string,
    });
    super({ adapter });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Runs `fn` inside a transaction with the RLS session settings applied. */
  async withTenant<T>(
    context: { organizationId?: string | null; userId?: string | null; bypass?: boolean },
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${context.organizationId ?? ''}, true),
        set_config('app.current_user_id', ${context.userId ?? ''}, true),
        set_config('app.bypass_rls', ${context.bypass ? 'on' : 'off'}, true)`;
      return fn(tx);
    });
  }
}

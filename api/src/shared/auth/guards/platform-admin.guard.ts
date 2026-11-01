import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { TokensService } from '../tokens.service';
import { AccountGuard } from './account.guard';
import { TokenContexts } from '../interfaces/auth-context.interface';

/** Platform administrators only (`User.role` ADMIN / SUPER_ADMIN), read fresh from the database. */
@Injectable()
export class PlatformAdminGuard extends AccountGuard {
  constructor(
    tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {
    super(tokens);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest();
    const user = await this.prisma.user.findUnique({ where: { id: request.account.user_id }, select: { role: true, deleted_at: true } });
    const isAdmin = !!user && !user.deleted_at && (user.role === AuthRole.ADMIN || user.role === AuthRole.SUPER_ADMIN);
    // Portal sessions are never platform-admin sessions, whatever the account's role.
    if (!isAdmin || request.account.context === TokenContexts.PORTAL) {
      throw new ForbiddenException({ message: 'Administrator access required', code: 'admin_required' });
    }
    return true;
  }
}

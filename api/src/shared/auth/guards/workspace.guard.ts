import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipStatus, OrganizationRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService, CacheKeys } from '@/core/cache/app-cache.service';
import { TokensService } from '../tokens.service';
import { extractBearer } from './account.guard';
import { TokenContexts, WorkspaceContext } from '../interfaces/auth-context.interface';
import { Permission, RolePermissions } from '../permissions';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * Employee requests. The token must have been issued for a workspace (portal tokens are
 * rejected), the membership must be active, and any `@RequirePermissions()` must be held.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractBearer(request);
    if (!token) {
      throw new UnauthorizedException({ message: 'Authentication required', code: 'authentication_required' });
    }
    const payload = await this.tokens.verifyAccess(token);
    if (payload.ctx !== TokenContexts.WORKSPACE || !payload.org) {
      throw new ForbiddenException({ message: 'Select a workspace first', code: 'workspace_required' });
    }

    const membership = await this.cache.getOrSet(CacheKeys.membership(payload.org, payload.sub), 30, () =>
      this.prisma.organizationMember.findFirst({
        where: {
          organization_id: payload.org,
          user_id: payload.sub,
          removed_at: null,
          status: MembershipStatus.ACTIVE,
          organization: { deleted_at: null },
        },
        select: { id: true, role: true },
      }),
    );
    if (!membership) {
      throw new ForbiddenException({ message: 'You no longer have access to this workspace', code: 'membership_revoked' });
    }

    const role = membership.role as OrganizationRole;
    const workspace: WorkspaceContext = {
      user_id: payload.sub,
      session_id: payload.sid,
      context: payload.ctx,
      organization_id: payload.org,
      member_id: membership.id,
      role,
      permissions: RolePermissions[role],
    };
    request.workspace = workspace;
    request.account = workspace;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required?.length && !required.every((p) => workspace.permissions.includes(p))) {
      throw new ForbiddenException({ message: 'You do not have permission to do this', code: 'forbidden' });
    }
    return true;
  }
}

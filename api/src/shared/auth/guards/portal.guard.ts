import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientStatus, ClientUserStatus } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { TokensService } from '../tokens.service';
import { extractBearer } from './account.guard';
import { PortalContext, TokenContexts } from '../interfaces/auth-context.interface';

/** Client-portal requests. Workspace tokens are never accepted here (and vice versa). */
@Injectable()
export class PortalGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractBearer(request);
    if (!token) {
      throw new UnauthorizedException({ message: 'Authentication required', code: 'authentication_required' });
    }
    const payload = await this.tokens.verifyAccess(token);
    if (payload.ctx !== TokenContexts.PORTAL || !payload.cu) {
      throw new ForbiddenException({ message: 'Open a client portal first', code: 'portal_required' });
    }
    const clientUser = await this.prisma.clientUser.findFirst({
      where: {
        id: payload.cu,
        user_id: payload.sub,
        status: ClientUserStatus.ACTIVE,
        client: { deleted_at: null, status: ClientStatus.ACTIVE },
      },
      select: { id: true, client_id: true, organization_id: true },
    });
    if (!clientUser) {
      throw new ForbiddenException({ message: 'Your portal access is no longer active', code: 'portal_revoked' });
    }
    const portal: PortalContext = {
      user_id: payload.sub,
      session_id: payload.sid,
      context: payload.ctx,
      organization_id: clientUser.organization_id,
      client_id: clientUser.client_id,
      client_user_id: clientUser.id,
    };
    request.portal = portal;
    request.account = portal;
    return true;
  }
}

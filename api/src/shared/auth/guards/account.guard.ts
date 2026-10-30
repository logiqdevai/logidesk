import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokensService } from '../tokens.service';
import { AccountContext } from '../interfaces/auth-context.interface';

export function extractBearer(request: any): string | null {
  const header: string | undefined = request.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

/** Any authenticated user, regardless of the active context. */
@Injectable()
export class AccountGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractBearer(request);
    if (!token) {
      throw new UnauthorizedException({ message: 'Authentication required', code: 'authentication_required' });
    }
    const payload = await this.tokens.verifyAccess(token);
    const account: AccountContext = { user_id: payload.sub, session_id: payload.sid, context: payload.ctx };
    request.account = account;
    request.tokenPayload = payload;
    return true;
  }
}

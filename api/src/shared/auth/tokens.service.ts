import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload, TokenContext } from './interfaces/auth-context.interface';

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class TokensService {
  private readonly secret: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.get<string>('JWT_SECRET');
  }

  async signAccess(input: {
    userId: string;
    sessionId: string;
    context: TokenContext;
    organizationId?: string;
    clientUserId?: string;
  }): Promise<{ access_token: string; expires_at: number }> {
    const payload: AccessTokenPayload = {
      sub: input.userId,
      sid: input.sessionId,
      ctx: input.context,
      org: input.organizationId,
      cu: input.clientUserId,
      typ: 'access',
    };
    const access_token = await this.jwt.signAsync(payload, {
      secret: this.secret,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    return { access_token, expires_at: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS };
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, { secret: this.secret });
      if (payload.typ !== 'access' || !payload.sub || !payload.sid) throw new Error('bad token');
      return payload;
    } catch {
      throw new UnauthorizedException({ message: 'Your session has expired', code: 'invalid_token' });
    }
  }
}

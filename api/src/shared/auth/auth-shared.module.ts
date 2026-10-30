import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokensService } from './tokens.service';
import { AccountGuard } from './guards/account.guard';
import { WorkspaceGuard } from './guards/workspace.guard';
import { PortalGuard } from './guards/portal.guard';
import { RateLimitGuard } from '../security/rate-limit.guard';
import { ClientAccessService } from './client-access.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [TokensService, AccountGuard, WorkspaceGuard, PortalGuard, RateLimitGuard, ClientAccessService],
  exports: [TokensService, AccountGuard, WorkspaceGuard, PortalGuard, RateLimitGuard, ClientAccessService, JwtModule],
})
export class AuthSharedModule {}

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { InvitationsService } from './services/invitations.service';
import { AuthEmailService } from './services/auth-email.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, InvitationsService, AuthEmailService],
  exports: [AuthService, AuthEmailService],
})
export class AuthModule {}

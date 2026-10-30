import { Body, Controller, Get, HttpCode, Patch, Post, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountGuard } from '@/shared/auth/guards/account.guard';
import { ClientIp, CurrentAccount } from '@/shared/auth/decorators/context.decorators';
import { AccountContext } from '@/shared/auth/interfaces/auth-context.interface';
import { RateLimit, RateLimitGuard } from '@/shared/security/rate-limit.guard';
import { AuthService } from './services/auth.service';
import { InvitationsService } from './services/invitations.service';
import {
  AcceptInvitationDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  SwitchContextDto,
  UpdateProfileDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invitations: InvitationsService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an account (single page for employees, owners and clients)' })
  @RateLimit({ name: 'register', limit: 10, windowSeconds: 3600 })
  register(@Body() dto: RegisterDto, @ClientIp() ip: string, @Headers('user-agent') ua: string) {
    return this.auth.register(dto, { ip, userAgent: ua });
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @RateLimit({ name: 'login', limit: 10, windowSeconds: 900, byEmail: true })
  login(@Body() dto: LoginDto, @ClientIp() ip: string, @Headers('user-agent') ua: string) {
    return this.auth.login(dto, { ip, userAgent: ua });
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @RateLimit({ name: 'refresh', limit: 120, windowSeconds: 900 })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AccountGuard)
  logout(@CurrentAccount() account: AccountContext) {
    return this.auth.logout(account.session_id);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AccountGuard)
  @ApiOperation({ summary: 'Current user with their workspaces and client portals' })
  me(@CurrentAccount('user_id') userId: string) {
    return this.auth.me(userId);
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(AccountGuard)
  updateProfile(@CurrentAccount('user_id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(userId, dto);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AccountGuard)
  @RateLimit({ name: 'change-password', limit: 10, windowSeconds: 900 })
  changePassword(@CurrentAccount() account: AccountContext, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(account.user_id, account.session_id, dto);
  }

  @Post('switch')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AccountGuard)
  @ApiOperation({ summary: 'Open a workspace or a client portal' })
  switch(@CurrentAccount() account: AccountContext, @Body() dto: SwitchContextDto) {
    return this.auth.switchContext(account.user_id, account.session_id, dto);
  }

  @Post('leave')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AccountGuard)
  @ApiOperation({ summary: 'Return to the workspace chooser' })
  leave(@CurrentAccount() account: AccountContext) {
    return this.auth.leaveContext(account.user_id, account.session_id);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @RateLimit({ name: 'forgot', limit: 5, windowSeconds: 900, byEmail: true })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @RateLimit({ name: 'reset', limit: 10, windowSeconds: 900 })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('verify-email')
  @HttpCode(200)
  @RateLimit({ name: 'verify', limit: 20, windowSeconds: 900 })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AccountGuard)
  @RateLimit({ name: 'resend-verification', limit: 5, windowSeconds: 900 })
  resendVerification(@CurrentAccount('user_id') userId: string) {
    return this.auth.resendVerification(userId);
  }

  @Get('invitations/lookup')
  @ApiOperation({ summary: 'Public: invitation context for the sign-in page' })
  @RateLimit({ name: 'invite-lookup', limit: 60, windowSeconds: 900 })
  lookupInvitation(@Query('token') token: string) {
    return this.invitations.lookup(token ?? '');
  }

  @Post('invitations/accept')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AccountGuard)
  @RateLimit({ name: 'invite-accept', limit: 20, windowSeconds: 900 })
  acceptInvitation(@CurrentAccount('user_id') userId: string, @Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(userId, dto.token);
  }
}

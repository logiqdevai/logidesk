import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  ClientStatus,
  ClientUserStatus,
  JobQueue,
  JobTrigger,
  MembershipStatus,
  SessionKind,
  User,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { JobsService } from '@/core/jobs/jobs.service';
import { JobNames } from '@/core/queues/queues.constants';
import { AppCacheService, CacheKeys } from '@/core/cache/app-cache.service';
import { REFRESH_TOKEN_TTL_DAYS, TokensService } from '@/shared/auth/tokens.service';
import { TokenContexts, TokenContext } from '@/shared/auth/interfaces/auth-context.interface';
import { generateToken, sha256 } from '@/shared/utils/crypto/crypto.utils';
import { RolePermissions } from '@/shared/auth/permissions';
import { languageForCountry } from '@/shared/i18n/language.utils';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SwitchContextDto,
  UpdateProfileDto,
} from '../dto/auth.dto';

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly jobs: JobsService,
    private readonly cache: AppCacheService,
  ) {}

  async register(dto: RegisterDto, meta: SessionMeta) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing && !existing.deleted_at) {
      throw new ConflictException({ message: 'An account with this email already exists. Sign in instead.', code: 'email_taken' });
    }
    const phoneOwner = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (phoneOwner && phoneOwner.email !== dto.email) {
      throw new ConflictException({ message: 'An account with this telephone number already exists.', code: 'phone_taken' });
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        first_name: dto.first_name,
        last_name: dto.last_name,
        country: dto.country,
        // Greek (and Cypriot) sign-ups get verification and password-reset emails in Greek.
        language: languageForCountry(dto.country) ?? 'en',
        password: await bcrypt.hash(dto.password, 10),
      },
    });
    return this.startSession(user, meta);
  }

  async login(dto: LoginDto, meta: SessionMeta) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Constant-ish time: always run bcrypt even when the user does not exist.
    const hash = user?.password || '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.Rr1pYy9HrPzAqp2n8kZB1wR7yH5W';
    const ok = await bcrypt.compare(dto.password, hash);
    if (!user || user.deleted_at || !user.password || !ok) {
      throw new UnauthorizedException({ message: 'Incorrect email or password', code: 'invalid_credentials' });
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
    return this.startSession(user, meta);
  }

  private async startSession(user: User, meta: SessionMeta) {
    const refresh = generateToken(48);
    const session = await this.prisma.session.create({
      data: {
        user_id: user.id,
        kind: SessionKind.WORKSPACE,
        token_hash: sha256(refresh),
        ip_address: meta.ip ?? null,
        user_agent: meta.userAgent?.slice(0, 500) ?? null,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000),
      },
    });
    const access = await this.tokens.signAccess({ userId: user.id, sessionId: session.id, context: TokenContexts.ACCOUNT });
    return {
      ...access,
      refresh_token: refresh,
      context: { type: TokenContexts.ACCOUNT as TokenContext },
      user: this.publicUser(user),
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({ where: { token_hash: sha256(refreshToken) } });
    if (!session || session.revoked_at || session.expires_at < new Date()) {
      throw new UnauthorizedException({ message: 'Your session has expired. Please sign in again.', code: 'session_expired' });
    }
    const next = generateToken(48);
    await this.prisma.session.update({
      where: { id: session.id },
      data: { token_hash: sha256(next), last_used_at: new Date() },
    });
    const context: TokenContext = session.client_user_id
      ? TokenContexts.PORTAL
      : session.organization_id
        ? TokenContexts.WORKSPACE
        : TokenContexts.ACCOUNT;
    const access = await this.tokens.signAccess({
      userId: session.user_id,
      sessionId: session.id,
      context,
      organizationId: session.organization_id ?? undefined,
      clientUserId: session.client_user_id ?? undefined,
    });
    return {
      ...access,
      refresh_token: next,
      context: {
        type: context,
        organization_id: session.organization_id,
        client_user_id: session.client_user_id,
      },
    };
  }

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({ where: { id: sessionId, revoked_at: null }, data: { revoked_at: new Date() } });
    return { success: true };
  }

  /** Opens a workspace or a client portal on the current session (new access token). */
  async switchContext(userId: string, sessionId: string, dto: SwitchContextDto) {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, user_id: userId, revoked_at: null } });
    if (!session) throw new UnauthorizedException({ message: 'Your session has expired', code: 'session_expired' });

    if (dto.organization_id) {
      const member = await this.prisma.organizationMember.findFirst({
        where: {
          organization_id: dto.organization_id,
          user_id: userId,
          removed_at: null,
          status: MembershipStatus.ACTIVE,
          organization: { deleted_at: null },
        },
      });
      if (!member) throw new ForbiddenException('You are not a member of this workspace');
      await this.prisma.session.update({
        where: { id: session.id },
        data: { kind: SessionKind.WORKSPACE, organization_id: dto.organization_id, client_user_id: null, last_used_at: new Date() },
      });
      await this.prisma.organizationMember.update({ where: { id: member.id }, data: { last_active_at: new Date() } });
      const access = await this.tokens.signAccess({
        userId,
        sessionId: session.id,
        context: TokenContexts.WORKSPACE,
        organizationId: dto.organization_id,
      });
      return { ...access, context: { type: TokenContexts.WORKSPACE, organization_id: dto.organization_id } };
    }

    const clientUser = await this.prisma.clientUser.findFirst({
      where: {
        id: dto.client_user_id,
        user_id: userId,
        status: ClientUserStatus.ACTIVE,
        client: { deleted_at: null, status: ClientStatus.ACTIVE },
      },
      include: { organization: { include: { portal_settings: true } }, user: true },
    });
    if (!clientUser) throw new ForbiddenException('This client portal is not available');
    if (clientUser.organization.portal_settings?.require_email_verification && !clientUser.user.email_verified_at) {
      throw new ForbiddenException({ message: 'Please verify your email address to open this portal', code: 'email_not_verified' });
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        kind: SessionKind.PORTAL,
        organization_id: clientUser.organization_id,
        client_user_id: clientUser.id,
        last_used_at: new Date(),
      },
    });
    await this.prisma.clientUser.update({ where: { id: clientUser.id }, data: { last_login_at: new Date() } });
    const access = await this.tokens.signAccess({
      userId,
      sessionId: session.id,
      context: TokenContexts.PORTAL,
      clientUserId: clientUser.id,
    });
    return {
      ...access,
      context: { type: TokenContexts.PORTAL, organization_id: clientUser.organization_id, client_user_id: clientUser.id },
    };
  }

  /** Back to the workspace chooser (account-level token). */
  async leaveContext(userId: string, sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, user_id: userId },
      data: { kind: SessionKind.WORKSPACE, organization_id: null, client_user_id: null },
    });
    const access = await this.tokens.signAccess({ userId, sessionId, context: TokenContexts.ACCOUNT });
    return { ...access, context: { type: TokenContexts.ACCOUNT } };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deleted_at) throw new NotFoundException('Account not found');
    return { user: this.publicUser(user), ...(await this.contexts(userId)) };
  }

  /** Workspaces the user works in, and client portals they were invited to (kept separate). */
  async contexts(userId: string) {
    const [memberships, portals] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where: { user_id: userId, removed_at: null, status: MembershipStatus.ACTIVE, organization: { deleted_at: null } },
        include: { organization: { select: { id: true, name: true, logo_url: true, slug: true } } },
        orderBy: { joined_at: 'asc' },
      }),
      this.prisma.clientUser.findMany({
        where: { user_id: userId, status: ClientUserStatus.ACTIVE, client: { deleted_at: null, status: ClientStatus.ACTIVE } },
        include: {
          organization: { select: { id: true, name: true, logo_url: true } },
          client: { select: { first_name: true, last_name: true, company: true } },
        },
      }),
    ]);
    const memberCounts = await this.prisma.organizationMember.groupBy({
      by: ['organization_id'],
      where: { organization_id: { in: memberships.map((m) => m.organization_id) }, removed_at: null },
      _count: true,
    });
    return {
      workspaces: memberships.map((m) => ({
        organization_id: m.organization_id,
        name: m.organization.name,
        logo_url: m.organization.logo_url,
        role: m.role,
        permissions: RolePermissions[m.role],
        member_count: memberCounts.find((c) => c.organization_id === m.organization_id)?._count ?? 1,
      })),
      portals: portals.map((p) => ({
        client_user_id: p.id,
        organization_id: p.organization_id,
        organization_name: p.organization.name,
        logo_url: p.organization.logo_url,
        client_name: [p.client.first_name, p.client.last_name].join(' '),
        company: p.client.company,
      })),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { first_name: dto.first_name, last_name: dto.last_name, phone: dto.phone || undefined, language: dto.language },
    });
    return this.publicUser(user);
  }

  async changePassword(userId: string, sessionId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.current_password, user.password))) {
      throw new BadRequestException({ message: 'Your current password is incorrect', code: 'invalid_password' });
    }
    await this.prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(dto.new_password, 10) } });
    // Sign out every other session.
    await this.prisma.session.updateMany({
      where: { user_id: userId, id: { not: sessionId }, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.deleted_at) await this.enqueueAuthEmail(user.id, 'reset_password');
    // Never reveal whether the account exists.
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token_hash: sha256(dto.token) } });
    if (!record || record.used_at || record.expires_at < new Date()) {
      throw new BadRequestException({ message: 'This reset link is invalid or has expired', code: 'invalid_token' });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.user_uuid },
        data: { password: await bcrypt.hash(dto.password, 10), email_verified_at: new Date() },
      }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { used_at: new Date() } }),
      this.prisma.session.updateMany({ where: { user_id: record.user_uuid, revoked_at: null }, data: { revoked_at: new Date() } }),
    ]);
    return { success: true };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { token_hash: sha256(token) } });
    if (!record || record.used_at || record.expires_at < new Date()) {
      throw new BadRequestException({ message: 'This verification link is invalid or has expired', code: 'invalid_token' });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.user_id }, data: { email_verified_at: new Date() } }),
      this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { used_at: new Date() } }),
    ]);
    return { success: true };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');
    if (user.email_verified_at) return { success: true, already_verified: true };
    await this.enqueueAuthEmail(user.id, 'verify_email');
    return { success: true };
  }

  private async enqueueAuthEmail(userId: string, kind: 'verify_email' | 'reset_password') {
    await this.jobs.enqueue({
      queue: JobQueue.NOTIFICATIONS,
      name: JobNames.AUTH_EMAIL,
      // One email per user, kind and minute: double-submits never send twice.
      jobId: `auth-${kind}-${userId}-${Math.floor(Date.now() / 60_000)}`,
      data: { user_id: userId, kind },
      trigger: JobTrigger.API_REQUEST,
      triggeredByUserId: userId,
      entityType: 'user',
      entityId: userId,
      attempts: 3,
      backoffMs: 30_000,
    });
  }

  async invalidateMembership(organizationId: string, userId: string) {
    await this.cache.invalidate(CacheKeys.membership(organizationId, userId));
  }

  publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      avatar_url: user.avatar_url,
      role: user.role,
      email_verified: !!user.email_verified_at,
      created_at: user.created_at,
    };
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import { AuthRole, InvitationStatus, InvitationType, JobQueue, JobTrigger, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { fullName } from '@/modules/activity/activity.service';
import { JobsService } from '@/core/jobs/jobs.service';
import { JobNames } from '@/core/queues/queues.constants';
import { generateToken, sha256 } from '@/shared/utils/crypto/crypto.utils';
import { AdminInviteUserDto, ListUsersQueryDto } from './dto/admin.dto';

/** Platform-level user administration. Access is enforced by `PlatformAdminGuard`. */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  private buildUserWhere(f: ListUsersQueryDto): Prisma.UserWhereInput {
    const term = f.search?.trim();
    const daysAgo = (n: string) => new Date(Date.now() - Number(n) * 86_400_000);
    const and: Prisma.UserWhereInput[] = [];

    if (term) {
      and.push({
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          { first_name: { contains: term, mode: 'insensitive' } },
          { last_name: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    if (f.organization_id || f.workspace_role) {
      and.push({
        memberships: {
          some: {
            removed_at: null,
            ...(f.organization_id && { organization_id: f.organization_id }),
            ...(f.workspace_role && { role: f.workspace_role }),
          },
        },
      });
    }
    if (f.account_role) and.push({ role: f.account_role as Prisma.UserWhereInput['role'] });
    if (f.verification) and.push({ email_verified_at: f.verification === 'verified' ? { not: null } : null });
    if (f.access === 'workspace') and.push({ memberships: { some: { removed_at: null } } });
    if (f.access === 'portal') and.push({ client_users: { some: {} } });
    if (f.access === 'none') and.push({ memberships: { none: { removed_at: null } }, client_users: { none: {} } });
    if (f.last_login === 'never') and.push({ last_login_at: null });
    else if (f.last_login) and.push({ last_login_at: { gte: daysAgo(f.last_login) } });
    if (f.joined) and.push({ created_at: { gte: daysAgo(f.joined) } });

    return { deleted_at: null, ...(and.length && { AND: and }) };
  }

  async listUsers(filters: ListUsersQueryDto = {}) {
    const term = filters.search?.trim();
    const where = this.buildUserWhere(filters);
    const [users, invitations, organizations] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          memberships: {
            where: { removed_at: null },
            select: { role: true, status: true, organization: { select: { id: true, name: true } } },
          },
          _count: { select: { client_users: true } },
        },
      }),
      this.prisma.invitation.findMany({
        where: {
          type: InvitationType.PLATFORM,
          status: InvitationStatus.PENDING,
          ...(term && { email: { contains: term, mode: 'insensitive' } }),
        },
        orderBy: { created_at: 'desc' },
        include: {
          invited_by: { select: { first_name: true, last_name: true, email: true } },
        },
      }),
      this.prisma.organization.findMany({ where: { deleted_at: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        name: fullName(u) || u.email,
        email: u.email,
        account_role: u.role,
        email_verified: !!u.email_verified_at,
        portal_access: u._count.client_users > 0,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
        workspaces: u.memberships.map((m) => ({
          organization_id: m.organization.id,
          name: m.organization.name,
          role: m.role,
          status: m.status,
        })),
      })),
      invitations: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        account_role: i.account_role,
        expires_at: i.expires_at,
        expired: i.expires_at < new Date(),
        invited_by: i.invited_by ? fullName(i.invited_by) || i.invited_by.email : null,
        created_at: i.created_at,
      })),
      organizations,
    };
  }

  /**
   * Registration is closed, so this is how an account is created: the invitee gets a link, creates
   * their account from it and is granted `dto.role` on acceptance. Not tied to any workspace.
   */
  async inviteUser(adminUserId: string, dto: AdminInviteUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { deleted_at: true } });
    if (existing && !existing.deleted_at) throw new ConflictException(`${dto.email} already has an account`);

    const expires_at = new Date(Date.now() + 7 * 86_400_000);
    const pending = await this.prisma.invitation.findFirst({
      where: { type: InvitationType.PLATFORM, email: dto.email, status: InvitationStatus.PENDING },
    });
    const invitation = pending
      ? await this.prisma.invitation.update({
          where: { id: pending.id },
          data: {
            account_role: dto.role as AuthRole,
            language: dto.language ?? 'el',
            message: dto.message ?? pending.message,
            invited_by_user_id: adminUserId,
            expires_at,
            send_count: { increment: 1 },
          },
        })
      : await this.prisma.invitation.create({
          data: {
            type: InvitationType.PLATFORM,
            email: dto.email,
            account_role: dto.role as AuthRole,
            language: dto.language ?? 'el',
            message: dto.message ?? null,
            token_hash: sha256(generateToken()),
            invited_by_user_id: adminUserId,
            expires_at,
          },
        });

    // The link is minted by the worker at send time, so the raw token never sits in a job payload.
    await this.jobs.enqueue({
      queue: JobQueue.NOTIFICATIONS,
      name: JobNames.AUTH_EMAIL,
      jobId: `auth-platform_invite-${invitation.id}-${invitation.send_count}`,
      data: { invitation_id: invitation.id, kind: 'platform_invite' },
      trigger: JobTrigger.API_REQUEST,
      triggeredByUserId: adminUserId,
      entityType: 'invitation',
      entityId: invitation.id,
      attempts: 3,
      backoffMs: 30_000,
    });
    return this.listUsers();
  }
}

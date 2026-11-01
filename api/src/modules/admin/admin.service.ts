import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthRole, InvitationStatus, InvitationType, JobQueue, JobTrigger, MembershipStatus, OrganizationRole, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ActivityService, fullName } from '@/modules/activity/activity.service';
import { AppCacheService, CacheKeys } from '@/core/cache/app-cache.service';
import { StorageService } from '@/core/storage/storage.service';
import { JobsService } from '@/core/jobs/jobs.service';
import { JobNames } from '@/core/queues/queues.constants';
import { generateToken, sha256 } from '@/shared/utils/crypto/crypto.utils';
import { AdminInviteUserDto, ListUsersQueryDto } from './dto/admin.dto';

/** Platform-level user administration. Access is enforced by `PlatformAdminGuard`. */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly storage: StorageService,
    private readonly cache: AppCacheService,
    private readonly activity: ActivityService,
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

  /** Workspaces where this user is the only active Owner: they cannot outlive the account. */
  private async soleOwnedWorkspaces(userId: string) {
    const owned = await this.prisma.organizationMember.findMany({
      where: { user_id: userId, role: OrganizationRole.OWNER, removed_at: null, organization: { deleted_at: null } },
      select: { organization: { select: { id: true, name: true } } },
    });
    const sole: { id: string; name: string }[] = [];
    for (const { organization } of owned) {
      const otherOwners = await this.prisma.organizationMember.count({
        where: {
          organization_id: organization.id,
          user_id: { not: userId },
          role: OrganizationRole.OWNER,
          removed_at: null,
          status: MembershipStatus.ACTIVE,
          user: { deleted_at: null },
        },
      });
      if (!otherOwners) sole.push(organization);
    }
    return sole;
  }

  private async assertCanDelete(adminUserId: string, target: { id: string; role: AuthRole }) {
    if (target.id === adminUserId) throw new BadRequestException('You cannot delete your own account');
    if (target.role === AuthRole.ADMIN || target.role === AuthRole.SUPER_ADMIN) {
      const caller = await this.prisma.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
      if (caller?.role !== AuthRole.SUPER_ADMIN) throw new ForbiddenException('Only a super admin can delete another administrator');
    }
  }

  private async findDeletable(adminUserId: string, userId: string) {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      select: { id: true, email: true, role: true, first_name: true, last_name: true },
    });
    if (!target) throw new NotFoundException('User not found');
    await this.assertCanDelete(adminUserId, target);
    return target;
  }

  /** Shown in the confirmation dialog before anything is deleted. */
  async deletionPreview(adminUserId: string, userId: string) {
    const target = await this.findDeletable(adminUserId, userId);
    const doomed = await this.soleOwnedWorkspaces(userId);
    const doomedIds = new Set(doomed.map((w) => w.id));
    const [workspaces, memberships] = await Promise.all([
      Promise.all(
        doomed.map(async (w) => {
          const [members, clients, documents] = await Promise.all([
            this.prisma.organizationMember.count({ where: { organization_id: w.id, removed_at: null } }),
            this.prisma.client.count({ where: { organization_id: w.id, deleted_at: null } }),
            this.prisma.document.count({ where: { organization_id: w.id, deleted_at: null } }),
          ]);
          return { id: w.id, name: w.name, members, clients, documents };
        }),
      ),
      this.prisma.organizationMember.findMany({
        where: { user_id: userId, removed_at: null, organization: { deleted_at: null } },
        select: { role: true, organization: { select: { id: true, name: true } } },
      }),
    ]);
    return {
      user: { id: target.id, name: fullName(target) || target.email, email: target.email },
      workspaces_deleted: workspaces,
      workspaces_kept: memberships
        .filter((m) => !doomedIds.has(m.organization.id))
        .map((m) => ({ id: m.organization.id, name: m.organization.name, role: m.role })),
    };
  }

  /**
   * Permanently deletes the account and every workspace the user solely owns (everything in a
   * workspace cascades from the organization row). Storage keys are read first, the database rows
   * are removed in one transaction, and the files are removed afterwards (best effort, never throws:
   * a storage hiccup must not undo a committed deletion).
   */
  async deleteUser(adminUserId: string, userId: string) {
    const target = await this.findDeletable(adminUserId, userId);
    const doomed = await this.soleOwnedWorkspaces(userId);
    const doomedIds = doomed.map((w) => w.id);
    const memberships = await this.prisma.organizationMember.findMany({
      where: { user_id: userId },
      select: { organization_id: true, removed_at: true },
    });
    const keptActive = memberships.filter((m) => !m.removed_at && !doomedIds.includes(m.organization_id)).map((m) => m.organization_id);

    const keys = await this.prisma.withTenant(
      { bypass: true, userId: adminUserId },
      async (tx) => {
        const inOrgs = { organization_id: { in: doomedIds } };
        const [docs, versions, attachments, orgs] = doomedIds.length
          ? await Promise.all([
              tx.document.findMany({ where: inOrgs, select: { storage_key: true } }),
              tx.documentVersion.findMany({ where: inOrgs, select: { storage_key: true } }),
              tx.emailAttachment.findMany({ where: inOrgs, select: { storage_key: true } }),
              tx.organization.findMany({ where: { id: { in: doomedIds } }, select: { logo_storage_key: true } }),
            ])
          : [[], [], [], []];
        if (doomedIds.length) await tx.organization.deleteMany({ where: { id: { in: doomedIds } } });
        await tx.invitation.deleteMany({ where: { type: InvitationType.PLATFORM, email: target.email } });
        await tx.user.delete({ where: { id: userId } });
        return [
          ...docs.map((d) => d.storage_key),
          ...versions.map((v) => v.storage_key),
          ...attachments.map((a) => a.storage_key),
          ...orgs.map((o) => o.logo_storage_key),
        ];
      },
      { timeout: 120_000, maxWait: 10_000 },
    );

    await this.storage.deleteMany(keys);
    this.logger.log(`Admin ${adminUserId} deleted user ${userId}: ${doomedIds.length} workspace(s), ${new Set(keys.filter(Boolean)).size} stored file(s)`);

    await this.cache.invalidate(...memberships.map((m) => CacheKeys.membership(m.organization_id, userId)));
    await Promise.all([...doomedIds, ...keptActive].map((id) => this.cache.invalidateOrganization(id)));
    await Promise.all(
      keptActive.map((organizationId) =>
        this.activity.log({
          organizationId,
          action: 'team.member_removed',
          entityType: 'user',
          actorUserId: adminUserId,
          description: `${fullName(target) || target.email} was removed because their account was deleted by a platform administrator`,
        }),
      ),
    );
    return { success: true, deleted_workspaces: doomed };
  }
}

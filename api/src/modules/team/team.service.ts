import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InvitationStatus,
  InvitationType,
  MembershipStatus,
  NotificationTrigger,
  NotificationType,
  OrganizationRole,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService, CacheKeys } from '@/core/cache/app-cache.service';
import { ActivityService, fullName } from '@/modules/activity/activity.service';
import { NotificationsService, SECURE_LINK_PLACEHOLDER } from '@/modules/notifications/services/notifications.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { generateToken, sha256 } from '@/shared/utils/crypto/crypto.utils';

const ROLE_LABEL: Record<OrganizationRole, string> = { OWNER: 'an Owner', ADMIN: 'an Admin', MEMBER: 'a Member' };

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
    private readonly cache: AppCacheService,
  ) {}

  async list(ws: WorkspaceContext) {
    const [members, invitations] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where: { organization_id: ws.organization_id, removed_at: null },
        include: {
          user: { select: { id: true, email: true, first_name: true, last_name: true, last_login_at: true } },
          _count: { select: { client_assignments: { where: { client: { deleted_at: null, status: 'ACTIVE' } } } } },
        },
        orderBy: [{ role: 'asc' }, { joined_at: 'asc' }],
      }),
      ws.permissions.includes(Permission.TEAM_MANAGE)
        ? this.prisma.invitation.findMany({
            where: { organization_id: ws.organization_id, type: InvitationType.TEAM, status: InvitationStatus.PENDING },
            include: { invited_by: { select: { first_name: true, last_name: true } } },
            orderBy: { created_at: 'desc' },
          })
        : [],
    ]);
    return {
      members: members.map((m) => ({
        member_id: m.id,
        user_id: m.user.id,
        name: fullName(m.user) || m.user.email,
        email: m.user.email,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
        last_active_at: m.last_active_at ?? m.user.last_login_at,
        client_count: m._count.client_assignments,
        is_you: m.user_id === ws.user_id,
      })),
      invitations: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        message: i.message,
        expires_at: i.expires_at,
        expired: i.expires_at < new Date(),
        last_sent_at: i.last_sent_at ?? i.created_at,
        invited_by: i.invited_by ? fullName(i.invited_by) : null,
      })),
      owner_count: members.filter((m) => m.role === OrganizationRole.OWNER).length,
    };
  }

  async invite(ws: WorkspaceContext, input: { email: string; role: OrganizationRole; message?: string }) {
    const email = input.email.trim().toLowerCase();
    if (input.role === OrganizationRole.OWNER && !ws.permissions.includes(Permission.TEAM_GRANT_OWNER)) {
      throw new ForbiddenException('Only Owners can invite another Owner');
    }
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: { organization_id: ws.organization_id, removed_at: null, user: { email } },
    });
    if (existingMember) throw new ConflictException(`${email} is already a member of this workspace`);
    const pending = await this.prisma.invitation.findFirst({
      where: { organization_id: ws.organization_id, type: InvitationType.TEAM, email, status: InvitationStatus.PENDING },
    });
    const invitation = pending
      ? await this.prisma.invitation.update({
          where: { id: pending.id },
          data: { role: input.role, message: input.message ?? pending.message, expires_at: new Date(Date.now() + 7 * 86_400_000), send_count: { increment: 1 } },
        })
      : await this.prisma.invitation.create({
          data: {
            organization_id: ws.organization_id,
            type: InvitationType.TEAM,
            email,
            role: input.role,
            message: input.message ?? null,
            token_hash: sha256(generateToken()),
            invited_by_user_id: ws.user_id,
            expires_at: new Date(Date.now() + 7 * 86_400_000),
          },
        });
    await this.sendInvitationEmail(ws, invitation.id);
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'team.member_invited',
      entityType: 'invitation',
      entityId: invitation.id,
      actorUserId: ws.user_id,
      description: `Invited ${email} as ${input.role.toLowerCase()}`,
    });
    return this.list(ws);
  }

  private async sendInvitationEmail(ws: WorkspaceContext, invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    const inviter = await this.prisma.user.findUnique({ where: { id: ws.user_id } });
    await this.notifications.notify({
      organizationId: ws.organization_id,
      type: NotificationType.TEAM_INVITATION,
      trigger: NotificationTrigger.MANUAL,
      recipientAddress: invitation.email,
      sentByUserId: ws.user_id,
      variables: {
        inviter_name: fullName(inviter) || inviter.email,
        role: ROLE_LABEL[invitation.role ?? OrganizationRole.MEMBER],
        message: invitation.message ?? '',
        invitation_link: SECURE_LINK_PLACEHOLDER,
      },
      metadata: { invitation_id: invitation.id },
      idempotencyKey: `team-invite:${invitation.id}:${invitation.send_count}`,
    });
  }

  async resend(ws: WorkspaceContext, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organization_id: ws.organization_id, type: InvitationType.TEAM, status: InvitationStatus.PENDING },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { expires_at: new Date(Date.now() + 7 * 86_400_000), send_count: { increment: 1 } },
    });
    await this.sendInvitationEmail(ws, invitation.id);
    return this.list(ws);
  }

  async revoke(ws: WorkspaceContext, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organization_id: ws.organization_id, type: InvitationType.TEAM, status: InvitationStatus.PENDING },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.prisma.invitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.REVOKED, revoked_at: new Date() } });
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'team.invitation_revoked',
      entityType: 'invitation',
      entityId: invitation.id,
      actorUserId: ws.user_id,
      description: `Revoked the invitation for ${invitation.email}`,
    });
    return this.list(ws);
  }

  private async ownerCount(organizationId: string) {
    return this.prisma.organizationMember.count({
      where: { organization_id: organizationId, role: OrganizationRole.OWNER, removed_at: null, status: MembershipStatus.ACTIVE },
    });
  }

  /**
   * Role changes: only Owners grant or remove the Owner role, and the last remaining Owner can
   * never be demoted. Admins manage Admins and Members.
   */
  async changeRole(ws: WorkspaceContext, memberId: string, role: OrganizationRole) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organization_id: ws.organization_id, removed_at: null },
      include: { user: { select: { email: true, first_name: true, last_name: true } } },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === role) return this.list(ws);
    const touchesOwner = role === OrganizationRole.OWNER || member.role === OrganizationRole.OWNER;
    if (touchesOwner && !ws.permissions.includes(Permission.TEAM_GRANT_OWNER)) {
      throw new ForbiddenException('Only Owners can grant or remove the Owner role');
    }
    if (member.role === OrganizationRole.OWNER && (await this.ownerCount(ws.organization_id)) <= 1) {
      throw new BadRequestException('The last remaining Owner cannot be demoted. Make someone else an Owner first.');
    }
    await this.prisma.organizationMember.update({ where: { id: member.id }, data: { role } });
    await this.cache.invalidate(CacheKeys.membership(ws.organization_id, member.user_id));
    await this.cache.invalidateOrganization(ws.organization_id);
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'team.role_changed',
      entityType: 'organization_member',
      entityId: member.id,
      actorUserId: ws.user_id,
      description: `Changed ${fullName(member.user) || member.user.email} from ${member.role.toLowerCase()} to ${role.toLowerCase()}`,
      metadata: { from: member.role, to: role },
    });
    return this.list(ws);
  }

  async remove(ws: WorkspaceContext, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organization_id: ws.organization_id, removed_at: null },
      include: { user: { select: { email: true, first_name: true, last_name: true } } },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === OrganizationRole.OWNER) {
      if (!ws.permissions.includes(Permission.TEAM_GRANT_OWNER)) throw new ForbiddenException('Only Owners can remove an Owner');
      if ((await this.ownerCount(ws.organization_id)) <= 1) throw new BadRequestException('The last remaining Owner cannot be removed');
    }
    await this.prisma.$transaction([
      this.prisma.organizationMember.update({ where: { id: member.id }, data: { removed_at: new Date() } }),
      this.prisma.clientAssignment.deleteMany({ where: { organization_member_id: member.id } }),
      this.prisma.session.updateMany({
        where: { user_id: member.user_id, organization_id: ws.organization_id, revoked_at: null },
        data: { organization_id: null },
      }),
    ]);
    await this.cache.invalidate(CacheKeys.membership(ws.organization_id, member.user_id));
    await this.cache.invalidateOrganization(ws.organization_id);
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'team.member_removed',
      entityType: 'organization_member',
      entityId: member.id,
      actorUserId: ws.user_id,
      description: `Removed ${fullName(member.user) || member.user.email} from the workspace`,
    });
    return this.list(ws);
  }
}

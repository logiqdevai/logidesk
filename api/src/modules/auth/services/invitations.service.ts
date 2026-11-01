import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthRole,
  ClientUserStatus,
  InvitationStatus,
  InvitationType,
  MembershipStatus,
  OrganizationRole,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { sha256 } from '@/shared/utils/crypto/crypto.utils';
import { ActivityService } from '@/modules/activity/activity.service';
import { AppCacheService, CacheKeys } from '@/core/cache/app-cache.service';
import { TokenContexts } from '@/shared/auth/interfaces/auth-context.interface';

/** Team and client invitations both land on the single sign-in / create-account page. */
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly cache: AppCacheService,
  ) {}

  private async findByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token_hash: sha256(token) },
      include: {
        organization: { select: { id: true, name: true, logo_url: true, deleted_at: true } },
        client: { select: { id: true, first_name: true, last_name: true, company: true, phone: true, country: true } },
        invited_by: { select: { first_name: true, last_name: true } },
      },
    });
    if (!invitation || invitation.organization?.deleted_at) {
      throw new NotFoundException({ message: 'This invitation link is not valid', code: 'invitation_not_found' });
    }
    return invitation;
  }

  /** Public: context shown on the sign-in page for an invitation link. */
  async lookup(token: string) {
    const invitation = await this.findByToken(token);
    const expired = invitation.status === InvitationStatus.PENDING && invitation.expires_at < new Date();
    const user = await this.prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
    const status = expired ? InvitationStatus.EXPIRED : invitation.status;
    // Details the business already entered, used only to prefill the create-account form.
    const prefill =
      invitation.client && !user && status === InvitationStatus.PENDING
        ? {
            first_name: invitation.client.first_name,
            last_name: invitation.client.last_name,
            phone: invitation.client.phone,
            country: invitation.client.country,
          }
        : null;
    return {
      type: invitation.type,
      status,
      client_prefill: prefill,
      email: invitation.email,
      organization_name: invitation.organization?.name ?? null,
      organization_logo_url: invitation.organization?.logo_url ?? null,
      role: invitation.role,
      account_role: invitation.account_role,
      client_name: invitation.client ? `${invitation.client.first_name} ${invitation.client.last_name}` : null,
      invited_by: invitation.invited_by
        ? [invitation.invited_by.first_name, invitation.invited_by.last_name].filter(Boolean).join(' ')
        : null,
      message: invitation.message,
      account_exists: !!user,
    };
  }

  async accept(userId: string, token: string) {
    const invitation = await this.findByToken(token);
    if (invitation.status === InvitationStatus.REVOKED) throw new BadRequestException('This invitation has been revoked');
    if (invitation.status === InvitationStatus.ACCEPTED) {
      if (invitation.accepted_by_user_id !== userId) throw new BadRequestException('This invitation has already been used');
    } else if (invitation.expires_at < new Date()) {
      await this.prisma.invitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.EXPIRED } });
      throw new BadRequestException('This invitation has expired. Ask for a new one.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException({
        message: `This invitation was sent to ${invitation.email}. Sign in with that email address to accept it.`,
        code: 'invitation_email_mismatch',
      });
    }

    if (invitation.type === InvitationType.PLATFORM) {
      await this.prisma.$transaction(async (tx) => {
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.ACCEPTED, accepted_at: new Date(), accepted_by_user_id: userId },
        });
        await tx.user.update({
          where: { id: userId },
          data: {
            email_verified_at: user.email_verified_at ?? new Date(),
            // Never demote an existing super admin; otherwise grant the invited account role.
            ...(user.role !== AuthRole.SUPER_ADMIN && invitation.account_role && { role: invitation.account_role }),
          },
        });
      });
      return { context: { type: TokenContexts.ACCOUNT } };
    }

    if (invitation.type === InvitationType.TEAM) {
      const member = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.organizationMember.findUnique({
          where: { organization_id_user_id: { organization_id: invitation.organization_id, user_id: userId } },
        });
        const membership = existing
          ? await tx.organizationMember.update({
              where: { id: existing.id },
              data: existing.removed_at
                ? { removed_at: null, status: MembershipStatus.ACTIVE, role: invitation.role ?? OrganizationRole.MEMBER, joined_at: new Date() }
                : {},
            })
          : await tx.organizationMember.create({
              data: {
                organization_id: invitation.organization_id,
                user_id: userId,
                role: invitation.role ?? OrganizationRole.MEMBER,
              },
            });
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.ACCEPTED, accepted_at: new Date(), accepted_by_user_id: userId },
        });
        await tx.user.update({ where: { id: userId }, data: { email_verified_at: user.email_verified_at ?? new Date() } });
        return membership;
      });
      await this.cache.invalidate(CacheKeys.membership(invitation.organization_id, userId));
      await this.activity.log({
        organizationId: invitation.organization_id,
        action: 'team.member_joined',
        entityType: 'organization_member',
        entityId: member.id,
        actorUserId: userId,
        description: `${user.first_name ?? user.email} joined the workspace as ${member.role.toLowerCase()}`,
      });
      return { context: { type: TokenContexts.WORKSPACE, organization_id: invitation.organization_id } };
    }

    // CLIENT invitation → activate the portal account for this client.
    const clientUser = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.clientUser.findFirst({
        where: { client_id: invitation.client_id, OR: [{ email: invitation.email }, { user_id: userId }] },
      });
      if (existing?.status === ClientUserStatus.DISABLED) throw new ForbiddenException('Portal access is disabled for this client');
      const data = {
        user_id: userId,
        status: ClientUserStatus.ACTIVE,
        activated_at: existing?.activated_at ?? new Date(),
        disabled_at: null,
      };
      const row = existing
        ? await tx.clientUser.update({ where: { id: existing.id }, data })
        : await tx.clientUser.create({
            data: {
              ...data,
              organization_id: invitation.organization_id,
              client_id: invitation.client_id,
              email: invitation.email,
              invited_at: invitation.created_at,
            },
          });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED, accepted_at: new Date(), accepted_by_user_id: userId },
      });
      // The invitation link was delivered to this address, which proves ownership.
      await tx.user.update({ where: { id: userId }, data: { email_verified_at: user.email_verified_at ?? new Date() } });
      return row;
    });
    await this.activity.log({
      organizationId: invitation.organization_id,
      action: 'client.portal_activated',
      entityType: 'client',
      entityId: invitation.client_id,
      clientId: invitation.client_id,
      actorClientUserId: clientUser.id,
      description: 'Activated their client portal',
    });
    return { context: { type: TokenContexts.PORTAL, client_user_id: clientUser.id, organization_id: invitation.organization_id } };
  }
}

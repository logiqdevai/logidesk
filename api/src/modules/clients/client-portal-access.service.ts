import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ClientUserStatus,
  Invitation,
  InvitationStatus,
  InvitationType,
  NotificationTrigger,
  NotificationType,
  PortalAccessMode,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { generateToken, sha256 } from '@/shared/utils/crypto/crypto.utils';
import { NotificationsService, SECURE_LINK_PLACEHOLDER } from '@/modules/notifications/services/notifications.service';
import { ActivityService } from '@/modules/activity/activity.service';

/** Client portal accounts and their invitations (portal activation without an employee-set password). */
@Injectable()
export class ClientPortalAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  /** Portal status for display: disabled wins over everything, then active, invited, not_invited. */
  static status(clientUsers: Array<{ status: ClientUserStatus }>): 'active' | 'invited' | 'not_invited' | 'disabled' {
    if (clientUsers.some((u) => u.status === ClientUserStatus.DISABLED)) return 'disabled';
    if (clientUsers.some((u) => u.status === ClientUserStatus.ACTIVE)) return 'active';
    if (clientUsers.some((u) => u.status === ClientUserStatus.INVITED)) return 'invited';
    return 'not_invited';
  }

  async isDisabled(clientId: string) {
    return (await this.prisma.clientUser.count({ where: { client_id: clientId, status: ClientUserStatus.DISABLED } })) > 0;
  }

  /** Blocks portal login for the client: ends their sessions and cancels pending invitations. */
  async disable(organizationId: string, clientId: string, userId: string | null) {
    const users = await this.prisma.clientUser.findMany({ where: { client_id: clientId, organization_id: organizationId } });
    if (!users.length) throw new BadRequestException('This client has no portal access to disable');
    if (users.every((u) => u.status === ClientUserStatus.DISABLED)) throw new BadRequestException('Portal access is already disabled');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.clientUser.updateMany({ where: { client_id: clientId, organization_id: organizationId }, data: { status: ClientUserStatus.DISABLED, disabled_at: now } }),
      this.prisma.session.updateMany({ where: { client_user_id: { in: users.map((u) => u.id) }, revoked_at: null }, data: { revoked_at: now } }),
      this.prisma.invitation.updateMany({
        where: { organization_id: organizationId, client_id: clientId, type: InvitationType.CLIENT, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.REVOKED },
      }),
    ]);
    await this.activity.log({
      organizationId,
      action: 'client.portal_disabled',
      entityType: 'client',
      entityId: clientId,
      clientId,
      actorUserId: userId,
      description: 'Portal access disabled',
    });
    return { success: true };
  }

  /** Restores portal access: clients who had activated go back to active, the rest to invited (re-send the invitation). */
  async enable(organizationId: string, clientId: string, userId: string | null) {
    const users = await this.prisma.clientUser.findMany({ where: { client_id: clientId, organization_id: organizationId, status: ClientUserStatus.DISABLED } });
    if (!users.length) throw new BadRequestException('Portal access is not disabled');
    await this.prisma.$transaction(
      users.map((u) =>
        this.prisma.clientUser.update({
          where: { id: u.id },
          data: { status: u.activated_at && u.user_id ? ClientUserStatus.ACTIVE : ClientUserStatus.INVITED, disabled_at: null },
        }),
      ),
    );
    await this.activity.log({
      organizationId,
      action: 'client.portal_enabled',
      entityType: 'client',
      entityId: clientId,
      clientId,
      actorUserId: userId,
      description: 'Portal access re-enabled',
    });
    return { success: true };
  }

  async hasActivePortal(clientId: string) {
    return (await this.prisma.clientUser.count({ where: { client_id: clientId, status: ClientUserStatus.ACTIVE } })) > 0;
  }

  /**
   * Makes sure a pending invitation exists for the client's email and returns it. The raw token
   * is generated when the email is delivered (see NotificationDeliveryService).
   */
  async ensureInvitation(organizationId: string, clientId: string, invitedByUserId: string | null): Promise<Invitation | null> {
    const client = await this.prisma.client.findFirst({ where: { id: clientId, organization_id: organizationId } });
    if (!client?.email) return null;
    if (await this.isDisabled(client.id)) return null;
    const settings = await this.prisma.organizationPortalSettings.findUnique({ where: { organization_id: organizationId } });
    const validity = settings?.invitation_validity_days ?? 7;

    await this.prisma.clientUser.upsert({
      where: { client_id_email: { client_id: client.id, email: client.email } },
      create: {
        organization_id: organizationId,
        client_id: client.id,
        email: client.email,
        status: ClientUserStatus.INVITED,
        invited_at: new Date(),
      },
      update: {},
    });

    const pending = await this.prisma.invitation.findFirst({
      where: { organization_id: organizationId, client_id: client.id, type: InvitationType.CLIENT, status: InvitationStatus.PENDING, email: client.email },
      orderBy: { created_at: 'desc' },
    });
    if (pending) {
      return this.prisma.invitation.update({
        where: { id: pending.id },
        data: { expires_at: new Date(Date.now() + validity * 86_400_000), send_count: { increment: 1 }, invited_by_user_id: invitedByUserId ?? pending.invited_by_user_id },
      });
    }
    return this.prisma.invitation.create({
      data: {
        organization_id: organizationId,
        type: InvitationType.CLIENT,
        email: client.email,
        client_id: client.id,
        token_hash: sha256(generateToken()),
        invited_by_user_id: invitedByUserId,
        expires_at: new Date(Date.now() + validity * 86_400_000),
      },
    });
  }

  /** Sends (or re-sends) the portal invitation email. */
  async sendInvitation(organizationId: string, clientId: string, userId: string | null) {
    const settings = await this.prisma.organizationPortalSettings.findUnique({ where: { organization_id: organizationId } });
    if (settings?.access_mode === PortalAccessMode.PUBLIC) {
      throw new BadRequestException('Your portal is public — clients do not need an invitation. Share the public link instead.');
    }
    const client = await this.prisma.client.findFirst({ where: { id: clientId, organization_id: organizationId } });
    if (await this.isDisabled(clientId)) throw new BadRequestException('Portal access is disabled for this client. Re-enable it first.');
    if (client?.status === 'ARCHIVED') throw new BadRequestException('Restore the client before sending a portal invitation');
    if (!client?.email) throw new BadRequestException('Add an email address to the client first');
    // Already-active clients may be re-sent the link: accepting is idempotent and just signs them in.
    const invitation = await this.ensureInvitation(organizationId, clientId, userId);
    await this.notifications.notify({
      organizationId,
      type: NotificationType.CLIENT_INVITATION,
      trigger: NotificationTrigger.MANUAL,
      recipientAddress: client.email,
      recipientName: `${client.first_name} ${client.last_name}`,
      clientId: client.id,
      sentByUserId: userId,
      variables: {
        client_name: client.first_name,
        portal_link: SECURE_LINK_PLACEHOLDER,
        invitation_validity_days: settings?.invitation_validity_days ?? 7,
      },
      metadata: { invitation_id: invitation.id },
      idempotencyKey: `client-invite:${invitation.id}:${invitation.send_count}`,
    });
    await this.prisma.clientUser.updateMany({ where: { client_id: client.id, email: client.email }, data: { invited_at: new Date() } });
    await this.activity.log({
      organizationId,
      action: 'client.portal_invited',
      entityType: 'client',
      entityId: client.id,
      clientId: client.id,
      actorUserId: userId,
      description: `Portal invitation sent to ${client.email}`,
    });
    return { success: true };
  }
}

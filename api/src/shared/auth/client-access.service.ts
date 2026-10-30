import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { WorkspaceContext } from './interfaces/auth-context.interface';
import { Permission } from './permissions';

/**
 * Row-level access to clients for employees. Owners and Admins see every client of the
 * organization; Members only the clients they are assigned to.
 */
@Injectable()
export class ClientAccessService {
  constructor(private readonly prisma: PrismaService) {}

  canSeeAll(ws: WorkspaceContext): boolean {
    return ws.permissions.includes(Permission.CLIENTS_VIEW_ALL);
  }

  /** `where` fragment for the Client model. */
  clientWhere(ws: WorkspaceContext): Prisma.ClientWhereInput {
    const base: Prisma.ClientWhereInput = { organization_id: ws.organization_id, deleted_at: null };
    if (this.canSeeAll(ws)) return base;
    return { ...base, assignees: { some: { organization_member_id: ws.member_id } } };
  }

  /** `where` fragment for models with a `client` relation. */
  viaClient(ws: WorkspaceContext): { organization_id: string; client?: Prisma.ClientWhereInput } {
    if (this.canSeeAll(ws)) return { organization_id: ws.organization_id };
    return {
      organization_id: ws.organization_id,
      client: { assignees: { some: { organization_member_id: ws.member_id } } },
    };
  }

  async assertClient(ws: WorkspaceContext, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organization_id: ws.organization_id, deleted_at: null },
      include: { assignees: { select: { organization_member_id: true } } },
    });
    if (!client) throw new NotFoundException('Client not found');
    if (!this.canSeeAll(ws) && !client.assignees.some((a) => a.organization_member_id === ws.member_id)) {
      throw new ForbiddenException('You are not assigned to this client');
    }
    return client;
  }

  async assertAssignment(ws: WorkspaceContext, assignmentId: string) {
    const assignment = await this.prisma.formAssignment.findFirst({
      where: { id: assignmentId, organization_id: ws.organization_id },
      select: { id: true, client_id: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assertClient(ws, assignment.client_id);
    return assignment;
  }

  async assertRequirement(ws: WorkspaceContext, assignmentRequirementId: string) {
    const ar = await this.prisma.assignmentRequirement.findFirst({
      where: { id: assignmentRequirementId, organization_id: ws.organization_id },
      select: { id: true, assignment_id: true },
    });
    if (!ar) throw new NotFoundException('Document requirement not found');
    await this.assertAssignment(ws, ar.assignment_id);
    return ar;
  }
}

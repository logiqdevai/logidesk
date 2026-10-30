import { Injectable, Logger } from '@nestjs/common';
import { ActorType, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';

export interface ActivityInput {
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  actorClientUserId?: string | null;
  clientId?: string | null;
  assignmentId?: string | null;
  documentId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Append-only audit trail. Organization users can only read it (no update/delete endpoints;
 * the RLS policy allows INSERT/SELECT only).
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: ActivityInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.activityLog.create({
        data: {
          organization_id: input.organizationId,
          actor_type: input.actorUserId
            ? ActorType.USER
            : input.actorClientUserId
              ? ActorType.CLIENT_USER
              : ActorType.SYSTEM,
          actor_user_id: input.actorUserId ?? null,
          actor_client_user_id: input.actorClientUserId ?? null,
          action: input.action,
          entity_type: input.entityType,
          entity_id: input.entityId ?? null,
          client_id: input.clientId ?? null,
          assignment_id: input.assignmentId ?? null,
          document_id: input.documentId ?? null,
          description: input.description ?? null,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue,
          ip_address: input.ipAddress ?? null,
        },
      });
    } catch (error) {
      if (tx) throw error;
      this.logger.error(`Failed to write activity ${input.action}: ${error.message}`);
    }
  }

  async list(
    organizationId: string,
    filter: { clientId?: string; assignmentId?: string; clientScope?: Prisma.ClientWhereInput; limit?: number; before?: Date },
  ) {
    const where: Prisma.ActivityLogWhereInput = {
      organization_id: organizationId,
      ...(filter.clientId ? { client_id: filter.clientId } : {}),
      ...(filter.assignmentId ? { assignment_id: filter.assignmentId } : {}),
      ...(filter.before ? { created_at: { lt: filter.before } } : {}),
    };
    if (filter.clientScope && Object.keys(filter.clientScope).length) {
      where.OR = [{ client_id: null }, { client: filter.clientScope }];
    }
    const rows = await this.prisma.activityLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Math.min(filter.limit ?? 30, 200),
      include: {
        actor_user: { select: { id: true, first_name: true, last_name: true, email: true } },
        actor_client_user: { select: { id: true, email: true, client: { select: { first_name: true, last_name: true } } } },
        client: { select: { id: true, first_name: true, last_name: true, company: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      description: row.description,
      metadata: row.metadata,
      created_at: row.created_at,
      actor_type: row.actor_type,
      actor_name: row.actor_user
        ? fullName(row.actor_user) || row.actor_user.email
        : row.actor_client_user
          ? fullName(row.actor_client_user.client) || row.actor_client_user.email
          : 'System',
      client: row.client
        ? { id: row.client.id, name: fullName(row.client), company: row.client.company }
        : null,
      assignment_id: row.assignment_id,
      document_id: row.document_id,
    }));
  }
}

export function fullName(p: { first_name?: string | null; last_name?: string | null } | null | undefined): string {
  if (!p) return '';
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
}

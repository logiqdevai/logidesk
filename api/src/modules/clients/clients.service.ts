import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssignmentStatus,
  ClientStatus,
  MembershipStatus,
  Prisma,
  RequirementStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { ActivityService, fullName } from '@/modules/activity/activity.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { paginate } from '@/shared/utils/pagination/pagination.utils';
import { addDays } from '@/shared/utils/dates/dates.utils';
import { ProgressService } from '@/modules/assignments/services/progress.service';
import { ClientPortalAccessService } from './client-portal-access.service';
import { ClientQueryType, CreateClientDto, UpdateClientDto } from './dto/client.dto';

const TRACKED_FIELDS = ['first_name', 'last_name', 'company', 'email', 'phone', 'tax_id', 'country', 'address', 'company_info'] as const;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
    private readonly activity: ActivityService,
    private readonly portalAccess: ClientPortalAccessService,
    private readonly progress: ProgressService,
    private readonly cache: AppCacheService,
  ) {}

  async list(ws: WorkspaceContext, query: ClientQueryType) {
    const where: Prisma.ClientWhereInput = { ...this.access.clientWhere(ws) };
    const and: Prisma.ClientWhereInput[] = [];
    if (query.status !== 'all') where.status = query.status as ClientStatus;
    if (query.search) {
      const terms = query.search.split(/\s+/).filter(Boolean).slice(0, 4);
      for (const term of terms) {
        and.push({
          OR: [
            { first_name: { contains: term, mode: 'insensitive' } },
            { last_name: { contains: term, mode: 'insensitive' } },
            { company: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        });
      }
    }
    if (query.employee_id) and.push({ assignees: { some: { organization_member_id: query.employee_id } } });
    if (query.portal === 'active') and.push({ client_users: { some: { status: 'ACTIVE' } } });
    if (query.portal === 'invited') and.push({ client_users: { some: { status: 'INVITED' }, none: { status: 'ACTIVE' } } });
    if (query.portal === 'not_invited') and.push({ client_users: { none: {} } });
    if (query.attention === 'true') {
      and.push({
        form_assignments: {
          some: {
            cancelled_at: null,
            OR: [{ requirements_missing: { gt: 0 } }, { requirements_expired: { gt: 0 } }, { status: AssignmentStatus.OVERDUE }],
          },
        },
      });
    }
    if (and.length) where.AND = and;

    const orderBy: Prisma.ClientOrderByWithRelationInput[] =
      query.sort === 'created_at' ? [{ created_at: 'desc' }] : [{ last_name: 'asc' }, { first_name: 'asc' }];

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          assignees: { include: { member: { include: { user: { select: { first_name: true, last_name: true, email: true } } } } } },
          client_users: { select: { status: true, last_login_at: true } },
          form_assignments: {
            where: { cancelled_at: null },
            select: {
              status: true,
              requirements_total: true,
              requirements_completed: true,
              requirements_missing: true,
              requirements_expired: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    const fieldRows = await this.prisma.formAssignment.findMany({
      where: { client_id: { in: clients.map((c) => c.id) }, cancelled_at: null },
      select: {
        client_id: true,
        form_version: { select: { definition: true } },
        response: { select: { answers: { select: { field_key: true, value: true } } } },
      },
    });
    const fieldsByClient = new Map<string, { total: number; answered: number }>();
    for (const row of fieldRows) {
      const answers = Object.fromEntries((row.response?.answers ?? []).map((x) => [x.field_key, x.value]));
      const p = ProgressService.requiredFieldProgress(row.form_version.definition as any, answers);
      const prev = fieldsByClient.get(row.client_id) ?? { total: 0, answered: 0 };
      fieldsByClient.set(row.client_id, { total: prev.total + p.total, answered: prev.answered + p.answered });
    }

    return paginate(
      clients.map((c) => {
        const fields = fieldsByClient.get(c.id) ?? { total: 0, answered: 0 };
        const totals = c.form_assignments.reduce(
          (acc, a) => ({
            total: acc.total + a.requirements_total,
            completed: acc.completed + a.requirements_completed,
            missing: acc.missing + a.requirements_missing,
            expired: acc.expired + a.requirements_expired,
          }),
          { total: fields.total, completed: fields.answered, missing: fields.total - fields.answered, expired: 0 },
        );
        return {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          company: c.company,
          email: c.email,
          phone: c.phone,
          status: c.status,
          created_at: c.created_at,
          assignees: c.assignees.map((a) => ({
            member_id: a.organization_member_id,
            name: fullName(a.member.user) || a.member.user.email,
          })),
          portal_status: ClientPortalAccessService.status(c.client_users),
          forms_count: c.form_assignments.length,
          overdue_count: c.form_assignments.filter((a) => a.status === AssignmentStatus.OVERDUE).length,
          requirements_total: totals.total,
          requirements_completed: totals.completed,
          requirements_missing: totals.missing,
          requirements_expired: totals.expired,
          progress_percent: totals.total ? Math.round((totals.completed / totals.total) * 100) : 0,
        };
      }),
      total,
      query.page,
      query.limit,
    );
  }

  async get(ws: WorkspaceContext, clientId: string) {
    await this.access.assertClient(ws, clientId);
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        assignees: {
          include: { member: { include: { user: { select: { first_name: true, last_name: true, email: true } } } } },
          orderBy: { created_at: 'asc' },
        },
        client_users: { select: { id: true, email: true, status: true, last_login_at: true, activated_at: true, invited_at: true } },
        created_by: { select: { first_name: true, last_name: true } },
      },
    });
    const today = await this.progress.today(ws.organization_id);
    const soon = addDays(today, 30);

    const requirements = await this.prisma.assignmentRequirement.findMany({
      where: { organization_id: ws.organization_id, assignment: { client_id: clientId, cancelled_at: null } },
      include: {
        document_requirement: { select: { name: true, is_required: true } },
        assignment: { select: { id: true, form: { select: { name: true } }, deadline: true } },
        current_document: {
          select: { id: true, uploaded_at: true, expiration_date: true, source: true, original_filename: true, file_format: true },
        },
      },
    });
    const counts = (s: RequirementStatus) => requirements.filter((r) => r.status === s).length;
    const item = (r: (typeof requirements)[number]) => ({
      assignment_requirement_id: r.id,
      assignment_id: r.assignment.id,
      name: r.document_requirement.name,
      form_name: r.assignment.form.name,
      status: r.status,
      deadline: r.deadline ?? r.assignment.deadline,
      document: r.current_document,
    });
    const expiringSoon = requirements.filter(
      (r) =>
        r.status === RequirementStatus.APPROVED &&
        r.current_document?.expiration_date &&
        r.current_document.expiration_date.getTime() >= today.getTime() &&
        r.current_document.expiration_date.getTime() <= soon.getTime(),
    );
    const recent = await this.prisma.document.findMany({
      where: { organization_id: ws.organization_id, client_id: clientId, deleted_at: null },
      orderBy: { uploaded_at: 'desc' },
      take: 5,
      include: { assignment: { select: { form: { select: { name: true } } } } },
    });
    const active = requirements.filter((r) => r.status !== RequirementStatus.NOT_REQUIRED);

    const assignments = await this.prisma.formAssignment.findMany({
      where: { organization_id: ws.organization_id, client_id: clientId, cancelled_at: null },
      select: {
        form_version: { select: { definition: true } },
        response: { select: { answers: { select: { field_key: true, value: true } } } },
      },
    });
    const fieldTotals = assignments.reduce(
      (acc, a) => {
        const answers = Object.fromEntries((a.response?.answers ?? []).map((x) => [x.field_key, x.value]));
        const p = ProgressService.requiredFieldProgress(a.form_version.definition as any, answers);
        return { total: acc.total + p.total, answered: acc.answered + p.answered };
      },
      { total: 0, answered: 0 },
    );
    const overallTotal = active.length + fieldTotals.total;
    const overallDone = counts(RequirementStatus.APPROVED) + fieldTotals.answered;

    return {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      tax_id: client.tax_id,
      country: client.country,
      address: client.address,
      company_info: client.company_info,
      status: client.status,
      archived_at: client.archived_at,
      created_at: client.created_at,
      created_by: client.created_by ? fullName(client.created_by) : null,
      assignees: client.assignees.map((a) => ({
        member_id: a.organization_member_id,
        name: fullName(a.member.user) || a.member.user.email,
        email: a.member.user.email,
        role: a.member.role,
      })),
      portal: {
        status: ClientPortalAccessService.status(client.client_users),
        last_login_at: client.client_users.map((u) => u.last_login_at).filter(Boolean).sort().pop() ?? null,
        invited_at: client.client_users.map((u) => u.invited_at).filter(Boolean).sort().pop() ?? null,
        email: client.client_users[0]?.email ?? client.email,
      },
      overview: {
        total: overallTotal,
        approved: overallDone,
        under_review: counts(RequirementStatus.UNDER_REVIEW) + counts(RequirementStatus.SUBMITTED),
        missing: counts(RequirementStatus.MISSING) + (fieldTotals.total - fieldTotals.answered),
        rejected: counts(RequirementStatus.REJECTED),
        expired: counts(RequirementStatus.EXPIRED),
        expiring_soon: expiringSoon.length,
        progress_percent: overallTotal ? Math.round((overallDone / overallTotal) * 100) : 0,
        missing_items: requirements.filter((r) => r.status === RequirementStatus.MISSING || r.status === RequirementStatus.REJECTED).map(item),
        expired_items: requirements.filter((r) => r.status === RequirementStatus.EXPIRED).map(item),
        expiring_items: expiringSoon.map(item),
        review_items: requirements
          .filter((r) => r.status === RequirementStatus.UNDER_REVIEW || r.status === RequirementStatus.SUBMITTED)
          .map(item),
        recent_documents: recent.map((d) => ({
          id: d.id,
          title: d.title,
          original_filename: d.original_filename,
          file_format: d.file_format,
          uploaded_at: d.uploaded_at,
          source: d.source,
          review_status: d.review_status,
          form_name: d.assignment?.form.name ?? null,
        })),
      },
    };
  }

  private async validateMembers(organizationId: string, memberIds: string[]) {
    if (!memberIds.length) return [];
    const members = await this.prisma.organizationMember.findMany({
      where: { id: { in: memberIds }, organization_id: organizationId, removed_at: null, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (members.length !== new Set(memberIds).size) throw new BadRequestException('One or more employees are not part of this workspace');
    return members.map((m) => m.id);
  }

  async create(ws: WorkspaceContext, dto: CreateClientDto) {
    let memberIds = dto.assignee_member_ids ?? [];
    if (!ws.permissions.includes(Permission.CLIENTS_ASSIGN_EMPLOYEES) || !memberIds.length) {
      // Members always look after the clients they create.
      memberIds = Array.from(new Set([...memberIds, ws.member_id]));
    }
    if (!this.access.canSeeAll(ws) && !memberIds.includes(ws.member_id)) memberIds.push(ws.member_id);
    memberIds = await this.validateMembers(ws.organization_id, memberIds);

    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          organization_id: ws.organization_id,
          first_name: dto.first_name,
          last_name: dto.last_name,
          company: dto.company ?? null,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          tax_id: dto.tax_id ?? null,
          country: dto.country ?? 'GR',
          address: dto.address ?? null,
          company_info: dto.company_info ?? null,
          created_by_user_id: ws.user_id,
        },
      });
      if (memberIds.length) {
        await tx.clientAssignment.createMany({
          data: memberIds.map((id) => ({
            organization_id: ws.organization_id,
            client_id: created.id,
            organization_member_id: id,
            assigned_by_user_id: ws.user_id,
          })),
        });
      }
      if (dto.internal_note) {
        await tx.clientNote.create({
          data: { organization_id: ws.organization_id, client_id: created.id, author_user_id: ws.user_id, body: dto.internal_note },
        });
      }
      await this.activity.log(
        {
          organizationId: ws.organization_id,
          action: 'client.created',
          entityType: 'client',
          entityId: created.id,
          clientId: created.id,
          actorUserId: ws.user_id,
          description: `Added client ${created.first_name} ${created.last_name}`,
        },
        tx,
      );
      return created;
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    if (dto.send_invitation !== false && client.email) {
      await this.portalAccess.sendInvitation(ws.organization_id, client.id, ws.user_id).catch(() => undefined);
    }
    return this.get(ws, client.id);
  }

  async update(ws: WorkspaceContext, clientId: string, dto: UpdateClientDto) {
    const existing = await this.access.assertClient(ws, clientId);
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const data: Prisma.ClientUpdateInput = {};
    for (const key of TRACKED_FIELDS) {
      if (dto[key] !== undefined && dto[key] !== existing[key]) {
        changes[key] = { from: existing[key], to: dto[key] };
        (data as any)[key] = dto[key];
      }
    }
    if (dto.assignee_member_ids && ws.permissions.includes(Permission.CLIENTS_ASSIGN_EMPLOYEES)) {
      await this.setAssignees(ws, clientId, dto.assignee_member_ids);
    }
    if (!Object.keys(changes).length) return this.get(ws, clientId);
    await this.prisma.client.update({ where: { id: clientId }, data });
    if (changes.email && existing.email) {
      // Keep a not-yet-activated portal account in sync with the new address.
      await this.prisma.clientUser.updateMany({
        where: { client_id: clientId, status: 'INVITED', email: existing.email },
        data: { email: dto.email ?? existing.email },
      });
    }
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'client.updated',
      entityType: 'client',
      entityId: clientId,
      clientId,
      actorUserId: ws.user_id,
      description: `Updated ${Object.keys(changes).map((k) => k.replace('_', ' ')).join(', ')}`,
      metadata: { changes },
    });
    return this.get(ws, clientId);
  }

  async setArchived(ws: WorkspaceContext, clientId: string, archived: boolean) {
    await this.access.assertClient(ws, clientId);
    await this.prisma.client.update({
      where: { id: clientId },
      data: archived
        ? { status: ClientStatus.ARCHIVED, archived_at: new Date() }
        : { status: ClientStatus.ACTIVE, archived_at: null },
    });
    await this.activity.log({
      organizationId: ws.organization_id,
      action: archived ? 'client.archived' : 'client.restored',
      entityType: 'client',
      entityId: clientId,
      clientId,
      actorUserId: ws.user_id,
      description: archived ? 'Archived client' : 'Restored client',
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    return this.get(ws, clientId);
  }

  /** Soft-deletes the client; every query already filters on `deleted_at`, and the portal guard blocks their login. */
  async remove(ws: WorkspaceContext, clientId: string) {
    await this.access.assertClient(ws, clientId);
    await this.prisma.client.update({ where: { id: clientId }, data: { deleted_at: new Date() } });
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'client.deleted',
      entityType: 'client',
      entityId: clientId,
      clientId,
      actorUserId: ws.user_id,
      description: 'Deleted client',
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    return { success: true };
  }

  async setAssignees(ws: WorkspaceContext, clientId: string, memberIds: string[]) {
    await this.access.assertClient(ws, clientId);
    const ids = await this.validateMembers(ws.organization_id, Array.from(new Set(memberIds)));
    if (!ids.length) throw new BadRequestException('Assign at least one employee');
    await this.prisma.$transaction([
      this.prisma.clientAssignment.deleteMany({ where: { client_id: clientId, organization_member_id: { notIn: ids } } }),
      ...ids.map((id) =>
        this.prisma.clientAssignment.upsert({
          where: { client_id_organization_member_id: { client_id: clientId, organization_member_id: id } },
          create: { organization_id: ws.organization_id, client_id: clientId, organization_member_id: id, assigned_by_user_id: ws.user_id },
          update: {},
        }),
      ),
    ]);
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'client.assignees_updated',
      entityType: 'client',
      entityId: clientId,
      clientId,
      actorUserId: ws.user_id,
      description: 'Updated assigned employees',
      metadata: { member_ids: ids },
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    return this.get(ws, clientId);
  }

  async listNotes(ws: WorkspaceContext, clientId: string) {
    await this.access.assertClient(ws, clientId);
    const notes = await this.prisma.clientNote.findMany({
      where: { client_id: clientId, organization_id: ws.organization_id, deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: { author: { select: { id: true, first_name: true, last_name: true, email: true } } },
    });
    return notes.map((n) => ({
      id: n.id,
      body: n.body,
      created_at: n.created_at,
      author_id: n.author_user_id,
      author_name: n.author ? fullName(n.author) || n.author.email : 'Former member',
      can_delete: n.author_user_id === ws.user_id || this.access.canSeeAll(ws),
    }));
  }

  async addNote(ws: WorkspaceContext, clientId: string, body: string) {
    await this.access.assertClient(ws, clientId);
    await this.prisma.clientNote.create({
      data: { organization_id: ws.organization_id, client_id: clientId, author_user_id: ws.user_id, body },
    });
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'client.note_added',
      entityType: 'client',
      entityId: clientId,
      clientId,
      actorUserId: ws.user_id,
      description: 'Added an internal note',
    });
    return this.listNotes(ws, clientId);
  }

  async deleteNote(ws: WorkspaceContext, clientId: string, noteId: string) {
    await this.access.assertClient(ws, clientId);
    const note = await this.prisma.clientNote.findFirst({ where: { id: noteId, client_id: clientId, deleted_at: null } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.author_user_id !== ws.user_id && !this.access.canSeeAll(ws)) {
      throw new ForbiddenException('You can only delete your own notes');
    }
    await this.prisma.clientNote.update({ where: { id: noteId }, data: { deleted_at: new Date() } });
    return this.listNotes(ws, clientId);
  }

  async activityFor(ws: WorkspaceContext, clientId: string) {
    await this.access.assertClient(ws, clientId);
    return this.activity.list(ws.organization_id, { clientId, limit: 100 });
  }

  async invitePortal(ws: WorkspaceContext, clientId: string) {
    await this.access.assertClient(ws, clientId);
    return this.portalAccess.sendInvitation(ws.organization_id, clientId, ws.user_id);
  }

  async setPortalDisabled(ws: WorkspaceContext, clientId: string, disabled: boolean) {
    await this.access.assertClient(ws, clientId);
    return disabled ? this.portalAccess.disable(ws.organization_id, clientId, ws.user_id) : this.portalAccess.enable(ws.organization_id, clientId, ws.user_id);
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AutomationTrigger,
  FormFieldType,
  FormResponseStatus,
  FormStatus,
  FormVersionStatus,
  NotificationTrigger,
  NotificationType,
  PortalAccessMode,
  Prisma,
  RequirementStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { ActivityService, fullName } from '@/modules/activity/activity.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { DEFAULT_TIME_ZONE, formatDeadline, parseDeadline, toIsoDateTime } from '@/shared/utils/dates/dates.utils';
import { allFields, FormDefinition, validateAnswers, VALUE_FIELD_TYPES } from '@/modules/forms/utils/form-definition.utils';
import { NotificationsService, SECURE_LINK_PLACEHOLDER } from '@/modules/notifications/services/notifications.service';
import { REQUIREMENT_SCHEDULE_INCLUDE, ReminderSchedulesService } from '@/modules/notifications/services/reminder-schedules.service';
import { documentList } from '@/modules/notifications/utils/template.utils';
import { emailStrings } from '@/modules/notifications/utils/email-i18n';
import { ClientPortalAccessService } from '@/modules/clients/client-portal-access.service';
import { DOCUMENT_INCLUDE, mapDocument } from '@/modules/documents/utils/document.mapper';
import { ProgressService } from './progress.service';
import { CreateAssignmentDto, SaveAnswersDto, UpdateAssignmentDto, UpdateRequirementDto } from '../dto/assignment.dto';

export interface Actor {
  userId?: string | null;
  clientUserId?: string | null;
}

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
    private readonly progress: ProgressService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
    private readonly schedules: ReminderSchedulesService,
    private readonly portalAccess: ClientPortalAccessService,
    private readonly cache: AppCacheService,
  ) {}

  async create(ws: WorkspaceContext, dto: CreateAssignmentDto) {
    const client = await this.access.assertClient(ws, dto.client_id);
    if (client.status === 'ARCHIVED') throw new BadRequestException('Restore the client before assigning forms');
    const forms = await this.prisma.form.findMany({
      where: { id: { in: dto.form_ids }, organization_id: ws.organization_id, deleted_at: null },
      include: { current_version: { include: { document_requirements: { orderBy: { sort_order: 'asc' } } } } },
    });
    if (forms.length !== new Set(dto.form_ids).size) throw new NotFoundException('One or more forms were not found');
    for (const form of forms) {
      if (form.status !== FormStatus.PUBLISHED || form.current_version?.status !== FormVersionStatus.PUBLISHED) {
        throw new BadRequestException(`"${form.name}" must be published before it can be assigned`);
      }
    }

    const zone = await this.orgZone(ws.organization_id);
    const deadline = parseDeadline(dto.deadline, zone);
    if (deadline && deadline.getTime() <= Date.now()) throw new BadRequestException('The deadline must be in the future');

    const created = await this.prisma.$transaction(async (tx) => {
      const scheduleId = await this.schedules.createOverride(tx, ws.organization_id, dto.reminder);
      const rows = [];
      for (const form of forms) {
        const version = form.current_version;
        const assignment = await tx.formAssignment.create({
          data: {
            organization_id: ws.organization_id,
            client_id: client.id,
            form_id: form.id,
            form_version_id: version.id,
            assigned_by_user_id: ws.user_id,
            deadline,
            reminder_schedule_id: scheduleId,
            message: dto.message ?? null,
            requirements: {
              create: version.document_requirements.map((r) => ({
                organization_id: ws.organization_id,
                document_requirement_id: r.id,
              })),
            },
            response: { create: { organization_id: ws.organization_id } },
          },
        });
        await this.progress.recalcAssignment(assignment.id, tx);
        await this.activity.log(
          {
            organizationId: ws.organization_id,
            action: 'form.assigned',
            entityType: 'form_assignment',
            entityId: assignment.id,
            clientId: client.id,
            assignmentId: assignment.id,
            actorUserId: ws.user_id,
            description: `Assigned "${form.name}"`,
            metadata: { form_id: form.id, deadline: deadline?.toISOString() ?? null },
          },
          tx,
        );
        rows.push({ assignment, form });
      }
      return rows;
    });

    if (dto.notify_client !== false) {
      await this.notifyAssigned(ws, client, created, dto, deadline, zone).catch(() => undefined);
    }
    await this.cache.invalidateOrganization(ws.organization_id);
    return created.map((c) => ({ id: c.assignment.id, form_id: c.form.id, form_name: c.form.name }));
  }

  private async orgZone(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { time_zone: true } });
    return org?.time_zone ?? DEFAULT_TIME_ZONE;
  }

  /** One combined "new form assignment" email per request (plus portal activation when needed). */
  private async notifyAssigned(
    ws: WorkspaceContext,
    client: { id: string; email: string | null; first_name: string; last_name: string },
    created: Array<{ assignment: { id: string }; form: { name: string; current_version: { document_requirements: { name: string }[] } } }>,
    dto: CreateAssignmentDto,
    deadline: Date | null,
    zone: string,
  ) {
    if (!client.email) return;
    const rule = await this.prisma.automationRule.findFirst({
      where: { organization_id: ws.organization_id, trigger: AutomationTrigger.FORM_ASSIGNED, form_id: null },
    });
    if (rule && !rule.enabled) return;
    const portal = await this.prisma.organizationPortalSettings.findUnique({ where: { organization_id: ws.organization_id } });
    const active = await this.portalAccess.hasActivePortal(client.id);
    let invitationId: string | null = null;
    if (!active && portal?.access_mode !== PortalAccessMode.PUBLIC && portal?.invite_on_first_assignment !== false) {
      invitationId = (await this.portalAccess.ensureInvitation(ws.organization_id, client.id, ws.user_id))?.id ?? null;
    }
    const clientUser = await this.prisma.clientUser.findFirst({ where: { client_id: client.id, status: 'ACTIVE' } });
    const docs = created.flatMap((c) => c.form.current_version.document_requirements.map((r) => ({ name: r.name })));
    const language = await this.notifications.emailLanguage(ws.organization_id, client.id);
    const strings = emailStrings(language);
    const deadlineText = deadline ? formatDeadline(deadline, zone, language) : '';
    await this.notifications.notify({
      organizationId: ws.organization_id,
      type: NotificationType.FORM_ASSIGNED,
      trigger: NotificationTrigger.AUTOMATIC,
      recipientAddress: client.email,
      recipientName: `${client.first_name} ${client.last_name}`,
      clientId: client.id,
      clientUserId: clientUser?.id,
      assignmentId: created[0].assignment.id,
      automationRuleId: rule?.id,
      sentByUserId: ws.user_id,
      variables: {
        client_name: client.first_name,
        form_name: created.map((c) => c.form.name).join('", "'),
        missing_documents: documentList(docs) || strings.completeFormQuestions,
        deadline: deadlineText,
        deadline_sentence: deadline ? strings.deadlineSentence(deadlineText) : '',
        portal_link: invitationId ? SECURE_LINK_PLACEHOLDER : this.notifications.portalUrl(),
        message: dto.message ?? '',
        invitation_validity_days: portal?.invitation_validity_days ?? 7,
      },
      metadata: { invitation_id: invitationId, assignment_ids: created.map((c) => c.assignment.id) },
      idempotencyKey: `assigned:${created.map((c) => c.assignment.id).join(',')}`,
    });
    if (invitationId) {
      await this.prisma.clientUser.updateMany({ where: { client_id: client.id, status: 'INVITED' }, data: { invited_at: new Date() } });
    }
  }

  async listForClient(ws: WorkspaceContext, clientId: string) {
    await this.access.assertClient(ws, clientId);
    const rows = await this.prisma.formAssignment.findMany({
      where: { organization_id: ws.organization_id, client_id: clientId },
      orderBy: [{ cancelled_at: 'asc' }, { assigned_at: 'desc' }],
      include: { form: { select: { id: true, name: true } }, assigned_by: { select: { first_name: true, last_name: true } } },
    });
    return rows.map((a) => ({
      id: a.id,
      form_id: a.form.id,
      form_name: a.form.name,
      assigned_at: a.assigned_at,
      assigned_by: a.assigned_by ? fullName(a.assigned_by) : null,
      deadline: toIsoDateTime(a.deadline),
      status: a.status,
      progress_percent: a.progress_percent,
      requirements_total: a.requirements_total,
      requirements_completed: a.requirements_completed,
      requirements_missing: a.requirements_missing,
      requirements_expired: a.requirements_expired,
      last_submission_at: a.last_submission_at,
      cancelled_at: a.cancelled_at,
    }));
  }

  /** Full client form view (answers + requirements + documents), pinned to the assignment's version. */
  async detail(organizationId: string, assignmentId: string, options: { portal?: boolean } = {}) {
    const assignment = await this.prisma.formAssignment.findFirst({
      where: { id: assignmentId, organization_id: organizationId },
      include: {
        client: { select: { id: true, first_name: true, last_name: true, company: true, email: true } },
        form: { select: { id: true, name: true } },
        form_version: true,
        reminder_schedule: true,
        assigned_by: { select: { first_name: true, last_name: true } },
        response: { include: { answers: true } },
        requirements: {
          include: {
            ...REQUIREMENT_SCHEDULE_INCLUDE,
            document_requirement: {
              include: { reminder_schedule: true },
            },
            documents: {
              where: { deleted_at: null },
              include: DOCUMENT_INCLUDE,
              orderBy: { uploaded_at: 'desc' },
            },
          },
        },
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    const orgDefault = await this.schedules.organizationDefault(organizationId);
    const definition = assignment.form_version.definition as unknown as FormDefinition;
    const order = new Map(allFields(definition).map((f, i) => [f.id, i]));
    const answers = Object.fromEntries((assignment.response?.answers ?? []).map((a) => [a.field_key, a.value]));

    const requirements = assignment.requirements
      .sort((a, b) => (order.get(a.document_requirement.field_key) ?? 0) - (order.get(b.document_requirement.field_key) ?? 0))
      .map((ar) => {
        const dr = ar.document_requirement;
        const docs = ar.documents.map(mapDocument);
        const schedule = this.schedules.resolve(orgDefault, ar as any);
        return {
          id: ar.id,
          field_key: dr.field_key,
          name: dr.name,
          description: dr.description,
          instructions: dr.instructions,
          is_required: dr.is_required,
          accepted_formats: dr.accepted_formats,
          max_file_size_mb: dr.max_file_size_mb,
          max_files: dr.max_files,
          allow_multiple_submissions: dr.allow_multiple_submissions,
          requires_approval: dr.requires_approval,
          expiration_policy: dr.expiration_policy,
          status: ar.status,
          deadline: toIsoDateTime(ar.deadline),
          effective_deadline: toIsoDateTime(ar.deadline ?? assignment.deadline),
          not_required_reason: ar.not_required_reason,
          current_documents: docs.filter((d) => d.is_current),
          history: options.portal ? [] : docs.filter((d) => !d.is_current),
          last_reminder_sent_at: ar.last_reminder_sent_at,
          reminders_sent_count: ar.reminders_sent_count,
          ...(options.portal
            ? {}
            : {
                reminder: this.schedules.summary(schedule),
                reminder_override: ar.reminder_schedule ?? null,
              }),
        };
      });

    return {
      id: assignment.id,
      status: assignment.status,
      assigned_at: assignment.assigned_at,
      assigned_by: assignment.assigned_by ? fullName(assignment.assigned_by) : null,
      deadline: toIsoDateTime(assignment.deadline),
      message: assignment.message,
      cancelled_at: assignment.cancelled_at,
      completed_at: assignment.completed_at,
      last_submission_at: assignment.last_submission_at,
      progress_percent: assignment.progress_percent,
      requirements_total: assignment.requirements_total,
      requirements_completed: assignment.requirements_completed,
      requirements_missing: assignment.requirements_missing,
      requirements_expired: assignment.requirements_expired,
      client: {
        id: assignment.client.id,
        name: `${assignment.client.first_name} ${assignment.client.last_name}`,
        company: assignment.client.company,
        email: options.portal ? undefined : assignment.client.email,
      },
      form: { id: assignment.form.id, name: assignment.form.name },
      title: assignment.form_version.title,
      description: assignment.form_version.description,
      instructions: assignment.form_version.instructions,
      definition,
      response: {
        status: assignment.response?.status ?? FormResponseStatus.DRAFT,
        submitted_at: assignment.response?.submitted_at ?? null,
        last_saved_at: assignment.response?.last_saved_at ?? null,
        locked_for_client:
          assignment.form_version.lock_after_submit && assignment.response?.status === FormResponseStatus.SUBMITTED,
        answers,
      },
      requirements,
      ...(options.portal
        ? {}
        : {
            reminder_override: assignment.reminder_schedule ?? null,
          }),
    };
  }

  async getForWorkspace(ws: WorkspaceContext, assignmentId: string) {
    await this.access.assertAssignment(ws, assignmentId);
    const detail = await this.detail(ws.organization_id, assignmentId);
    const changes = await this.activity.list(ws.organization_id, { assignmentId, limit: 50 });
    return { ...detail, recent_changes: changes };
  }

  /**
   * Saves answers for an assignment (client portal or an employee on the client's behalf).
   * Validated against the pinned form version; every changed value is audited.
   */
  async saveAnswers(organizationId: string, assignmentId: string, dto: SaveAnswersDto, actor: Actor, ip?: string) {
    const assignment = await this.prisma.formAssignment.findFirst({
      where: { id: assignmentId, organization_id: organizationId },
      include: { form_version: true, response: { include: { answers: true } }, form: { select: { name: true } } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.cancelled_at) throw new BadRequestException('This assignment was cancelled');
    if (actor.clientUserId && assignment.form_version.lock_after_submit && assignment.response?.status === FormResponseStatus.SUBMITTED) {
      throw new ForbiddenException('This form was submitted and can no longer be edited');
    }
    const definition = assignment.form_version.definition as unknown as FormDefinition;
    const existing = Object.fromEntries((assignment.response?.answers ?? []).map((a) => [a.field_key, a.value]));
    const merged = { ...existing, ...dto.answers };
    const { values, errors } = validateAnswers(definition, merged, { requireComplete: !!dto.submit });
    const touchedErrors = dto.submit
      ? errors
      : Object.fromEntries(Object.entries(errors).filter(([k]) => k in dto.answers));
    if (Object.keys(touchedErrors).length) {
      throw new BadRequestException({ message: 'Please fix the highlighted answers', errors: touchedErrors });
    }

    const fieldTypes = new Map(allFields(definition).map((f) => [f.id, f.type]));
    const changes: Array<{ field: string; label: string; from: unknown; to: unknown }> = [];
    const labels = new Map(allFields(definition).map((f) => [f.id, f.label]));

    await this.prisma.$transaction(async (tx) => {
      const response =
        assignment.response ??
        (await tx.formResponse.create({ data: { organization_id: organizationId, assignment_id: assignment.id } }));
      for (const [fieldKey, value] of Object.entries(values)) {
        const type = fieldTypes.get(fieldKey);
        if (!type || !VALUE_FIELD_TYPES.includes(type)) continue;
        const before = existing[fieldKey] ?? null;
        if (JSON.stringify(before) === JSON.stringify(value ?? null)) continue;
        changes.push({ field: fieldKey, label: labels.get(fieldKey) ?? fieldKey, from: before, to: value ?? null });
        await tx.formAnswer.upsert({
          where: { response_id_field_key: { response_id: response.id, field_key: fieldKey } },
          create: {
            organization_id: organizationId,
            response_id: response.id,
            field_key: fieldKey,
            field_type: type as FormFieldType,
            value: (value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            updated_by_user_id: actor.userId ?? null,
            updated_by_client_user_id: actor.clientUserId ?? null,
          },
          update: {
            value: (value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            updated_by_user_id: actor.userId ?? null,
            updated_by_client_user_id: actor.clientUserId ?? null,
          },
        });
      }
      await tx.formResponse.update({
        where: { id: response.id },
        data: {
          last_saved_at: new Date(),
          ...(dto.submit
            ? {
                status: FormResponseStatus.SUBMITTED,
                submitted_at: new Date(),
                submitted_by_user_id: actor.userId ?? null,
                submitted_by_client_user_id: actor.clientUserId ?? null,
              }
            : {}),
        },
      });
      if (changes.length || dto.submit) {
        await this.activity.log(
          {
            organizationId,
            action: dto.submit ? 'form.submitted' : 'form.answers_updated',
            entityType: 'form_assignment',
            entityId: assignment.id,
            clientId: assignment.client_id,
            assignmentId: assignment.id,
            actorUserId: actor.userId,
            actorClientUserId: actor.clientUserId,
            description: dto.submit
              ? `Submitted "${assignment.form.name}"`
              : `Updated ${changes.length} answer${changes.length === 1 ? '' : 's'}${actor.userId ? ' on behalf of the client' : ''}`,
            metadata: { changes: changes.slice(0, 50) },
            ipAddress: ip,
          },
          tx,
        );
      }
      await this.progress.recalcAssignment(assignment.id, tx);
    });
    await this.cache.invalidateOrganization(organizationId);
    return { saved: changes.length, submitted: !!dto.submit };
  }

  async update(ws: WorkspaceContext, assignmentId: string, dto: UpdateAssignmentDto) {
    await this.access.assertAssignment(ws, assignmentId);
    const zone = await this.orgZone(ws.organization_id);
    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.FormAssignmentUncheckedUpdateInput = {};
      if (dto.deadline !== undefined) data.deadline = parseDeadline(dto.deadline, zone);
      if (dto.message !== undefined) data.message = dto.message;
      if (dto.reminder !== undefined) data.reminder_schedule_id = await this.schedules.createOverride(tx, ws.organization_id, dto.reminder);
      await tx.formAssignment.update({ where: { id: assignmentId }, data });
      await this.progress.recalcAssignment(assignmentId, tx);
      await this.activity.log(
        {
          organizationId: ws.organization_id,
          action: 'assignment.updated',
          entityType: 'form_assignment',
          entityId: assignmentId,
          assignmentId,
          clientId: (await tx.formAssignment.findUnique({ where: { id: assignmentId }, select: { client_id: true } })).client_id,
          actorUserId: ws.user_id,
          description: dto.deadline !== undefined ? `Deadline set to ${data.deadline ? formatDeadline(data.deadline as Date, zone) : 'none'}` : 'Updated assignment settings',
          metadata: dto as Record<string, unknown>,
        },
        tx,
      );
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    return this.getForWorkspace(ws, assignmentId);
  }

  async updateRequirement(ws: WorkspaceContext, assignmentId: string, requirementId: string, dto: UpdateRequirementDto) {
    const assignment = await this.access.assertAssignment(ws, assignmentId);
    const ar = await this.prisma.assignmentRequirement.findFirst({
      where: { id: requirementId, assignment_id: assignmentId, organization_id: ws.organization_id },
      include: { document_requirement: { select: { name: true } } },
    });
    if (!ar) throw new NotFoundException('Requirement not found');
    const zone = await this.orgZone(ws.organization_id);
    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.AssignmentRequirementUncheckedUpdateInput = {};
      const notes: string[] = [];
      if (dto.deadline !== undefined) {
        data.deadline = parseDeadline(dto.deadline, zone);
        notes.push(`deadline ${data.deadline ? formatDeadline(data.deadline as Date, zone) : 'cleared'}`);
      }
      if (dto.not_required !== undefined) {
        data.not_required_at = dto.not_required ? new Date() : null;
        data.not_required_reason = dto.not_required ? (dto.not_required_reason ?? null) : null;
        data.not_required_by_user_id = dto.not_required ? ws.user_id : null;
        notes.push(dto.not_required ? 'marked not required' : 'marked required again');
      }
      if (dto.reminder !== undefined) {
        data.reminder_schedule_id = await this.schedules.createOverride(tx, ws.organization_id, dto.reminder);
        notes.push('reminder schedule changed');
      }
      await tx.assignmentRequirement.update({ where: { id: ar.id }, data });
      await this.progress.recalcAssignment(assignmentId, tx);
      await this.activity.log(
        {
          organizationId: ws.organization_id,
          action: 'requirement.updated',
          entityType: 'assignment_requirement',
          entityId: ar.id,
          assignmentId,
          clientId: assignment.client_id,
          actorUserId: ws.user_id,
          description: `${ar.document_requirement.name}: ${notes.join(', ')}`,
        },
        tx,
      );
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    return this.getForWorkspace(ws, assignmentId);
  }

  async cancel(ws: WorkspaceContext, assignmentId: string) {
    const assignment = await this.access.assertAssignment(ws, assignmentId);
    await this.prisma.$transaction(async (tx) => {
      await tx.formAssignment.update({ where: { id: assignmentId }, data: { cancelled_at: new Date() } });
      await this.progress.recalcAssignment(assignmentId, tx);
      await this.activity.log(
        {
          organizationId: ws.organization_id,
          action: 'assignment.cancelled',
          entityType: 'form_assignment',
          entityId: assignmentId,
          assignmentId,
          clientId: assignment.client_id,
          actorUserId: ws.user_id,
          description: 'Cancelled the assignment',
        },
        tx,
      );
    });
    await this.cache.invalidateOrganization(ws.organization_id);
    return { success: true };
  }

  /** Requirements a client still has to act on (for reminder previews). */
  async openRequirementsForClient(organizationId: string, clientId: string, assignmentId?: string) {
    return this.prisma.assignmentRequirement.findMany({
      where: {
        organization_id: organizationId,
        status: { in: [RequirementStatus.MISSING, RequirementStatus.REJECTED, RequirementStatus.EXPIRED] },
        assignment: { client_id: clientId, cancelled_at: null, ...(assignmentId ? { id: assignmentId } : {}) },
      },
      include: {
        document_requirement: { select: { name: true, is_required: true } },
        assignment: { select: { id: true, deadline: true, form: { select: { name: true } } } },
        current_document: { select: { expiration_date: true } },
      },
      orderBy: { created_at: 'asc' },
    });
  }
}

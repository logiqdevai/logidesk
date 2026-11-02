import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentRecurrence, FormStatus, Prisma, RecurrenceStatus } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { DEFAULT_TIME_ZONE, localDateString, toIsoDateTime } from '@/shared/utils/dates/dates.utils';
import { PreviewRecurrenceDto, UpdateRecurrenceDto } from '../dto/recurrence.dto';
import { AssignmentRecurrenceQueryType } from '../dto/assignment-recurrence-query.schema';
import { dtoToRule, rowToRule, ruleToData, serializeRecurrence } from '../utils/recurrence.mapper';
import { endOfLocalDay, nextRun, previewOccurrences, validateRecurrenceRule } from '../utils/recurrence.utils';

const CLIENT_SELECT = { select: { id: true, first_name: true, last_name: true, company: true } } as const;

/** Lifecycle of recurring series: list, edit, pause / resume, end and schedule previews. */
@Injectable()
export class AssignmentRecurrencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
    private readonly activity: ActivityService,
  ) {}

  async list(ws: WorkspaceContext, query: AssignmentRecurrenceQueryType) {
    const where: Prisma.AssignmentRecurrenceWhereInput = {
      ...this.access.viaClient(ws),
      ...(query.client_id ? { client_id: query.client_id } : {}),
      ...(query.form_id ? { form_ids: { has: query.form_id } } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.assignmentRecurrence.findMany({
        where,
        orderBy: [{ status: 'asc' }, { next_run_at: 'asc' }, { created_at: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { client: CLIENT_SELECT },
      }),
      this.prisma.assignmentRecurrence.count({ where }),
    ]);
    const forms = await this.formNames(ws.organization_id, rows.flatMap((r) => r.form_ids));
    return {
      data: rows.map((r) => serializeRecurrence(r, this.pickForms(r, forms))),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        total_pages: Math.ceil(total / query.limit),
        has_next: query.page < Math.ceil(total / query.limit),
        has_prev: query.page > 1,
      },
    };
  }

  async get(ws: WorkspaceContext, id: string) {
    const row = await this.find(ws, id);
    const forms = await this.formNames(ws.organization_id, row.form_ids);
    return serializeRecurrence(row, this.pickForms(row, forms));
  }

  /** Next occurrences (with deadlines) of a schedule that has not been saved yet. */
  async preview(ws: WorkspaceContext, dto: PreviewRecurrenceDto) {
    const zone = await this.orgZone(ws.organization_id);
    const today = localDateString(zone);
    const startNow = dto.start_now ?? (!dto.starts_on || dto.starts_on.slice(0, 10) <= today);
    const rule = dtoToRule({ ...dto, starts_on: startNow ? today : dto.starts_on }, zone);
    const error = validateRecurrenceRule(rule);
    if (error) throw new BadRequestException(error);
    const occurrences = previewOccurrences(rule, dto.count ?? 4, new Date(), { startNow });
    return { occurrences: occurrences.map((o) => ({ run_at: toIsoDateTime(o.run_at), deadline_at: toIsoDateTime(o.deadline_at) })) };
  }

  /** Changes apply to assignments created from now on; existing assignments are untouched. */
  async update(ws: WorkspaceContext, id: string, dto: UpdateRecurrenceDto) {
    const row = await this.find(ws, id);
    if (row.status === RecurrenceStatus.ENDED) throw new BadRequestException('This recurring series has ended');

    const { form_ids, message, notify_client, start_now: _startNow, ...schedule } = dto;
    const rule = dtoToRule(schedule, row.time_zone, rowToRule(row));
    const error = validateRecurrenceRule(rule);
    if (error) throw new BadRequestException(error);

    const data: Prisma.AssignmentRecurrenceUncheckedUpdateInput = { ...ruleToData(rule) };
    if (form_ids) {
      await this.assertPublishedForms(ws.organization_id, form_ids);
      data.form_ids = [...new Set(form_ids)];
    }
    if (message !== undefined) data.message = message || null;
    if (notify_client !== undefined) data.notify_client = notify_client;
    if (schedule.overlap_policy) data.overlap_policy = schedule.overlap_policy;

    if (row.status === RecurrenceStatus.ACTIVE) {
      const next = nextRun(rule, new Date(), row.occurrences_created);
      data.next_run_at = next;
      if (!next) this.markEnded(data);
    }
    const updated = await this.prisma.assignmentRecurrence.update({ where: { id }, data, include: { client: CLIENT_SELECT } });
    await this.log(ws, updated, 'recurrence.updated', 'Updated a recurring assignment');
    const forms = await this.formNames(ws.organization_id, updated.form_ids);
    return serializeRecurrence(updated, this.pickForms(updated, forms));
  }

  async pause(ws: WorkspaceContext, id: string) {
    const row = await this.find(ws, id);
    if (row.status !== RecurrenceStatus.ACTIVE) throw new BadRequestException('Only an active series can be paused');
    const updated = await this.prisma.assignmentRecurrence.update({
      where: { id },
      data: { status: RecurrenceStatus.PAUSED, paused_at: new Date(), next_run_at: null },
      include: { client: CLIENT_SELECT },
    });
    await this.log(ws, updated, 'recurrence.paused', 'Paused a recurring assignment');
    return serializeRecurrence(updated, this.pickForms(updated, await this.formNames(ws.organization_id, updated.form_ids)));
  }

  /** Resuming never back-fills missed occurrences: the next one is the next scheduled date. */
  async resume(ws: WorkspaceContext, id: string) {
    const row = await this.find(ws, id);
    if (row.status !== RecurrenceStatus.PAUSED) throw new BadRequestException('Only a paused series can be resumed');
    const next = nextRun(rowToRule(row), new Date(), row.occurrences_created);
    const data: Prisma.AssignmentRecurrenceUncheckedUpdateInput = { status: RecurrenceStatus.ACTIVE, paused_at: null, next_run_at: next };
    if (!next) this.markEnded(data);
    const updated = await this.prisma.assignmentRecurrence.update({ where: { id }, data, include: { client: CLIENT_SELECT } });
    await this.log(ws, updated, 'recurrence.resumed', 'Resumed a recurring assignment');
    return serializeRecurrence(updated, this.pickForms(updated, await this.formNames(ws.organization_id, updated.form_ids)));
  }

  /** Ends the series for good. Assignments it already created are kept. */
  async end(ws: WorkspaceContext, id: string) {
    const row = await this.find(ws, id);
    if (row.status === RecurrenceStatus.ENDED) return this.get(ws, id);
    const updated = await this.prisma.assignmentRecurrence.update({
      where: { id },
      data: { status: RecurrenceStatus.ENDED, ended_at: new Date(), next_run_at: null },
      include: { client: CLIENT_SELECT },
    });
    await this.log(ws, updated, 'recurrence.ended', 'Ended a recurring assignment');
    return serializeRecurrence(updated, this.pickForms(updated, await this.formNames(ws.organization_id, updated.form_ids)));
  }

  private markEnded(data: Prisma.AssignmentRecurrenceUncheckedUpdateInput) {
    data.status = RecurrenceStatus.ENDED;
    data.ended_at = new Date();
  }

  private async find(ws: WorkspaceContext, id: string) {
    const row = await this.prisma.assignmentRecurrence.findFirst({
      where: { id, ...this.access.viaClient(ws) },
      include: { client: CLIENT_SELECT },
    });
    if (!row) throw new NotFoundException('Recurring assignment not found');
    return row;
  }

  private async assertPublishedForms(organizationId: string, formIds: string[]) {
    const unique = [...new Set(formIds)];
    const forms = await this.prisma.form.findMany({ where: { id: { in: unique }, organization_id: organizationId, deleted_at: null } });
    if (forms.length !== unique.length) throw new NotFoundException('One or more forms were not found');
    const draft = forms.find((f) => f.status !== FormStatus.PUBLISHED);
    if (draft) throw new BadRequestException(`"${draft.name}" must be published before it can be assigned`);
  }

  private async formNames(organizationId: string, ids: string[]) {
    if (!ids.length) return new Map<string, string>();
    const forms = await this.prisma.form.findMany({ where: { id: { in: [...new Set(ids)] }, organization_id: organizationId }, select: { id: true, name: true } });
    return new Map(forms.map((f) => [f.id, f.name]));
  }

  private pickForms(row: AssignmentRecurrence, names: Map<string, string>) {
    return row.form_ids.filter((id) => names.has(id)).map((id) => ({ id, name: names.get(id) }));
  }

  private async orgZone(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { time_zone: true } });
    return org?.time_zone ?? DEFAULT_TIME_ZONE;
  }

  private log(ws: WorkspaceContext, row: AssignmentRecurrence, action: string, description: string) {
    return this.activity.log({
      organizationId: ws.organization_id,
      action,
      entityType: 'assignment_recurrence',
      entityId: row.id,
      clientId: row.client_id,
      actorUserId: ws.user_id,
      description,
    });
  }
}

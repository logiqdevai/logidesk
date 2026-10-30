import { Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { fullName } from '@/modules/activity/activity.service';
import { toIsoDate } from '@/shared/utils/dates/dates.utils';
import { SubmissionsQueryType } from '../dto/form.dto';

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  UNDER_REVIEW: 'Under review',
  COMPLETE: 'Complete',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

/** Form Submissions page: every client the form was assigned to. */
@Injectable()
export class FormSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
  ) {}

  async list(ws: WorkspaceContext, formId: string, query: SubmissionsQueryType) {
    const form = await this.prisma.form.findFirst({
      where: { id: formId, organization_id: ws.organization_id, deleted_at: null },
      select: { id: true, name: true, status: true },
    });
    if (!form) throw new NotFoundException('Form not found');

    const scope = this.access.viaClient(ws);
    const where: Prisma.FormAssignmentWhereInput = {
      organization_id: ws.organization_id,
      form_id: formId,
      cancelled_at: null,
      client: { deleted_at: null, ...(scope.client ?? {}) },
    };
    const and: Prisma.FormAssignmentWhereInput[] = [];
    if (query.client_id) and.push({ client_id: query.client_id });
    if (query.status) and.push({ status: query.status as AssignmentStatus });
    if (query.employee_id) and.push({ client: { assignees: { some: { organization_member_id: query.employee_id } } } });
    if (query.submitted === 'not_submitted') and.push({ last_submission_at: null, response: { status: 'DRAFT' } });
    const since = { '7d': 7, '30d': 30, '90d': 90 }[query.submitted];
    if (since) and.push({ last_submission_at: { gte: new Date(Date.now() - since * 86_400_000) } });
    if (query.search) {
      and.push({
        client: {
          OR: [
            { first_name: { contains: query.search, mode: 'insensitive' } },
            { last_name: { contains: query.search, mode: 'insensitive' } },
            { company: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (and.length) where.AND = and;

    const [rows, all] = await Promise.all([
      this.prisma.formAssignment.findMany({
        where,
        orderBy: { assigned_at: 'desc' },
        take: 1000,
        include: {
          client: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              company: true,
              email: true,
              assignees: { include: { member: { include: { user: { select: { first_name: true, last_name: true, email: true } } } } } },
            },
          },
          response: { select: { status: true, submitted_at: true } },
        },
      }),
      this.prisma.formAssignment.groupBy({
        by: ['status'],
        where: { organization_id: ws.organization_id, form_id: formId, cancelled_at: null, client: { deleted_at: null, ...(scope.client ?? {}) } },
        _count: true,
      }),
    ]);
    const count = (s: AssignmentStatus) => all.find((g) => g.status === s)?._count ?? 0;

    return {
      form,
      summary: {
        assigned: all.reduce((sum, g) => sum + g._count, 0),
        complete: count(AssignmentStatus.COMPLETE),
        under_review: count(AssignmentStatus.UNDER_REVIEW),
        overdue: count(AssignmentStatus.OVERDUE),
      },
      data: rows.map((a) => ({
        assignment_id: a.id,
        client: {
          id: a.client.id,
          name: `${a.client.first_name} ${a.client.last_name}`,
          company: a.client.company,
          email: a.client.email,
        },
        assignees: a.client.assignees.map((x) => ({
          member_id: x.organization_member_id,
          name: fullName(x.member.user) || x.member.user.email,
        })),
        assigned_at: a.assigned_at,
        last_submission_at: a.last_submission_at ?? a.response?.submitted_at ?? null,
        deadline: toIsoDate(a.deadline),
        requirements_completed: a.requirements_completed,
        requirements_total: a.requirements_total,
        progress_percent: a.progress_percent,
        status: a.status,
      })),
    };
  }

  /** CSV of the filtered list (built by the EXPORTS worker). */
  async toCsv(ws: WorkspaceContext, formId: string, query: SubmissionsQueryType): Promise<{ filename: string; content: string }> {
    const result = await this.list(ws, formId, query);
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Client', 'Company', 'Email', 'Assigned employees', 'Assigned', 'Last submission', 'Deadline', 'Documents completed', 'Documents total', 'Status'];
    const lines = result.data.map((r) =>
      [
        r.client.name,
        r.client.company,
        r.client.email,
        r.assignees.map((a) => a.name).join('; '),
        r.assigned_at.toISOString().slice(0, 10),
        r.last_submission_at ? new Date(r.last_submission_at).toISOString().slice(0, 10) : '',
        r.deadline,
        r.requirements_completed,
        r.requirements_total,
        STATUS_LABEL[r.status] ?? r.status,
      ]
        .map(esc)
        .join(','),
    );
    const slug = result.form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { filename: `${slug || 'form'}-submissions.csv`, content: [header.join(','), ...lines].join('\n') };
  }
}

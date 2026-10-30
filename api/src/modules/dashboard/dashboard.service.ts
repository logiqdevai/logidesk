import { Injectable } from '@nestjs/common';
import { AssignmentStatus, ClientStatus, Prisma, RequirementStatus } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService, CacheKeys } from '@/core/cache/app-cache.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { ActivityService } from '@/modules/activity/activity.service';
import { ProgressService } from '@/modules/assignments/services/progress.service';
import { InboxService } from '@/modules/inbox/inbox.service';
import { addDays } from '@/shared/utils/dates/dates.utils';

/** Dashboard statistics — always computed from database records (cached briefly in Redis). */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
    private readonly cache: AppCacheService,
    private readonly activity: ActivityService,
    private readonly progress: ProgressService,
    private readonly inbox: InboxService,
  ) {}

  async overview(ws: WorkspaceContext) {
    const key = this.access.canSeeAll(ws)
      ? CacheKeys.dashboard(ws.organization_id)
      : CacheKeys.memberDashboard(ws.organization_id, ws.member_id);
    const [stats, inboxCounts, activity] = await Promise.all([
      this.cache.getOrSet(key, 60, () => this.compute(ws)),
      this.inbox.counts(ws),
      this.activity.list(ws.organization_id, {
        limit: 12,
        clientScope: this.access.canSeeAll(ws) ? undefined : { assignees: { some: { organization_member_id: ws.member_id } } },
      }),
    ]);
    return { ...stats, stats: { ...stats.stats, inbox_needs_review: inboxCounts.needs_review }, recent_activity: activity };
  }

  private async compute(ws: WorkspaceContext) {
    const today = await this.progress.today(ws.organization_id);
    const soon = addDays(today, 30);
    const clientScope = this.access.clientWhere(ws);
    const activeClients: Prisma.ClientWhereInput = { ...clientScope, status: ClientStatus.ACTIVE };
    const reqWhere: Prisma.AssignmentRequirementWhereInput = {
      organization_id: ws.organization_id,
      assignment: { cancelled_at: null, client: activeClients },
    };

    const [clients, assignments, overdue, byStatus, expiringSoon, attentionRows] = await Promise.all([
      this.prisma.client.count({ where: activeClients }),
      this.prisma.formAssignment.count({ where: { organization_id: ws.organization_id, cancelled_at: null, client: activeClients } }),
      this.prisma.formAssignment.count({
        where: { organization_id: ws.organization_id, cancelled_at: null, status: AssignmentStatus.OVERDUE, client: activeClients },
      }),
      this.prisma.assignmentRequirement.groupBy({ by: ['status'], where: reqWhere, _count: true }),
      this.prisma.assignmentRequirement.count({
        where: {
          ...reqWhere,
          status: RequirementStatus.APPROVED,
          current_document: { expiration_date: { gte: today, lte: soon } },
        },
      }),
      this.prisma.client.findMany({
        where: {
          ...activeClients,
          form_assignments: {
            some: {
              cancelled_at: null,
              OR: [{ requirements_missing: { gt: 0 } }, { requirements_expired: { gt: 0 } }, { status: AssignmentStatus.OVERDUE }],
            },
          },
        },
        take: 50,
        include: {
          form_assignments: {
            where: { cancelled_at: null },
            select: {
              status: true,
              requirements_missing: true,
              requirements_expired: true,
              requirements_total: true,
              requirements_completed: true,
            },
          },
        },
      }),
    ]);
    const count = (...s: RequirementStatus[]) => byStatus.filter((g) => s.includes(g.status)).reduce((sum, g) => sum + g._count, 0);

    const expiringByClient = await this.prisma.assignmentRequirement.groupBy({
      by: ['assignment_id'],
      where: {
        ...reqWhere,
        status: RequirementStatus.APPROVED,
        current_document: { expiration_date: { gte: today, lte: soon } },
      },
      _count: true,
    });
    const expiringAssignments = expiringByClient.length
      ? await this.prisma.formAssignment.findMany({
          where: { id: { in: expiringByClient.map((e) => e.assignment_id) } },
          select: { id: true, client_id: true },
        })
      : [];

    const attention = attentionRows
      .map((c) => {
        const t = c.form_assignments.reduce(
          (acc, a) => ({
            missing: acc.missing + a.requirements_missing,
            expired: acc.expired + a.requirements_expired,
            total: acc.total + a.requirements_total,
            completed: acc.completed + a.requirements_completed,
            overdue: acc.overdue + (a.status === AssignmentStatus.OVERDUE ? 1 : 0),
          }),
          { missing: 0, expired: 0, total: 0, completed: 0, overdue: 0 },
        );
        const expiring = expiringAssignments
          .filter((a) => a.client_id === c.id)
          .reduce((sum, a) => sum + (expiringByClient.find((e) => e.assignment_id === a.id)?._count ?? 0), 0);
        return {
          client_id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          company: c.company,
          email: c.email,
          missing: t.missing,
          expired: t.expired,
          expiring,
          overdue_forms: t.overdue,
          progress_percent: t.total ? Math.round((t.completed / t.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.expired * 3 + b.missing + b.overdue_forms * 2 - (a.expired * 3 + a.missing + a.overdue_forms * 2))
      .slice(0, 8);

    const requested = count(
      RequirementStatus.MISSING,
      RequirementStatus.SUBMITTED,
      RequirementStatus.UNDER_REVIEW,
      RequirementStatus.APPROVED,
      RequirementStatus.REJECTED,
      RequirementStatus.EXPIRED,
    );
    return {
      stats: {
        total_clients: clients,
        assigned_forms: assignments,
        awaiting_submission: count(RequirementStatus.MISSING, RequirementStatus.REJECTED),
        awaiting_review: count(RequirementStatus.SUBMITTED, RequirementStatus.UNDER_REVIEW),
        approved: count(RequirementStatus.APPROVED),
        rejected: count(RequirementStatus.REJECTED),
        expired: count(RequirementStatus.EXPIRED),
        expiring_soon: expiringSoon,
        overdue_submissions: overdue,
      },
      progress: {
        requested,
        completed: count(RequirementStatus.APPROVED),
        missing: count(RequirementStatus.MISSING),
        rejected: count(RequirementStatus.REJECTED),
        awaiting_review: count(RequirementStatus.SUBMITTED, RequirementStatus.UNDER_REVIEW),
        expired: count(RequirementStatus.EXPIRED),
        percent: requested ? Math.round((count(RequirementStatus.APPROVED) / requested) * 100) : 0,
      },
      attention,
    };
  }
}

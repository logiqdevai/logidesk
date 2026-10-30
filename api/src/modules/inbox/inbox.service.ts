import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InboxProcessingStatus,
  InboxReviewAction,
  Prisma,
  PublicSubmissionStatus,
  RequirementStatus,
  ReviewStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService, CacheKeys } from '@/core/cache/app-cache.service';
import { ActivityService, fullName } from '@/modules/activity/activity.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { paginate } from '@/shared/utils/pagination/pagination.utils';
import { ProgressService } from '@/modules/assignments/services/progress.service';
import { DocumentsService } from '@/modules/documents/services/documents.service';
import { DOCUMENT_INCLUDE, mapDocument } from '@/modules/documents/utils/document.mapper';
import { InboxQueryType, ResolveInboxItemDto } from './dto/inbox.dto';

const ITEM_INCLUDE = {
  document: { include: DOCUMENT_INCLUDE },
  detected_client: { select: { id: true, first_name: true, last_name: true, company: true, email: true } },
  suggested_assignment: { select: { id: true, form: { select: { id: true, name: true } } } },
  suggested_requirement: { select: { id: true, status: true, document_requirement: { select: { name: true, requires_approval: true } } } },
  reviewed_by: { select: { first_name: true, last_name: true, email: true } },
  public_submission: { select: { id: true, submitter_name: true, submitter_email: true, submitter_company: true, answers: true, form: { select: { name: true } } } },
} satisfies Prisma.DocumentInboxItemInclude;

@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
    private readonly documents: DocumentsService,
    private readonly progress: ProgressService,
    private readonly activity: ActivityService,
    private readonly cache: AppCacheService,
  ) {}

  /** Members only see items of their clients; Owners/Admins also see unidentified items. */
  private scope(ws: WorkspaceContext): Prisma.DocumentInboxItemWhereInput {
    const base: Prisma.DocumentInboxItemWhereInput = { organization_id: ws.organization_id, document: { deleted_at: null } };
    if (ws.permissions.includes(Permission.CLIENTS_VIEW_ALL)) return base;
    return { ...base, detected_client: { assignees: { some: { organization_member_id: ws.member_id } } } };
  }

  async list(ws: WorkspaceContext, query: InboxQueryType) {
    const where: Prisma.DocumentInboxItemWhereInput = { ...this.scope(ws) };
    const and: Prisma.DocumentInboxItemWhereInput[] = [];
    if (query.view === 'needs_review') and.push({ needs_review: true });
    if (query.view === 'processed') and.push({ needs_review: false });
    if (query.source) and.push({ source: query.source as any });
    if (query.status) and.push({ processing_status: query.status as InboxProcessingStatus });
    if (query.confidence) and.push({ confidence: query.confidence as any });
    if (query.client_id === 'unidentified') and.push({ detected_client_id: null });
    else if (query.client_id) and.push({ detected_client_id: query.client_id });
    if (query.document_type) and.push({ detected_document_type: { equals: query.document_type, mode: 'insensitive' } });
    if (query.from) and.push({ received_at: { gte: new Date(query.from) } });
    if (query.to) and.push({ received_at: { lte: new Date(`${query.to}T23:59:59.999Z`) } });
    if (query.search) {
      and.push({
        OR: [
          { detected_document_type: { contains: query.search, mode: 'insensitive' } },
          { document: { original_filename: { contains: query.search, mode: 'insensitive' } } },
          { detected_client: { first_name: { contains: query.search, mode: 'insensitive' } } },
          { detected_client: { last_name: { contains: query.search, mode: 'insensitive' } } },
          { detected_client: { company: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }
    if (and.length) where.AND = and;
    const orderBy: Prisma.DocumentInboxItemOrderByWithRelationInput[] =
      query.sort === 'oldest'
        ? [{ received_at: 'asc' }]
        : query.sort === 'confidence'
          ? [{ confidence_score: 'asc' }, { received_at: 'desc' }]
          : [{ received_at: 'desc' }];
    const [items, total, counts] = await Promise.all([
      this.prisma.documentInboxItem.findMany({
        where,
        orderBy,
        include: ITEM_INCLUDE,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.documentInboxItem.count({ where }),
      this.counts(ws),
    ]);
    return { ...paginate(items.map((i) => this.map(i)), total, query.page, query.limit), counts };
  }

  async counts(ws: WorkspaceContext) {
    const key = this.access.canSeeAll(ws)
      ? CacheKeys.inboxCount(ws.organization_id)
      : CacheKeys.memberInboxCount(ws.organization_id, ws.member_id);
    return this.cache.getOrSet(key, 120, async () => {
      const scope = this.scope(ws);
      const [needsReview, processed] = await Promise.all([
        this.prisma.documentInboxItem.count({ where: { ...scope, needs_review: true } }),
        this.prisma.documentInboxItem.count({ where: { ...scope, needs_review: false } }),
      ]);
      return { needs_review: needsReview, processed, all: needsReview + processed };
    });
  }

  private map(item: Prisma.DocumentInboxItemGetPayload<{ include: typeof ITEM_INCLUDE }>) {
    return {
      id: item.id,
      source: item.source,
      processing_status: item.processing_status,
      needs_review: item.needs_review,
      requires_approval: item.requires_approval,
      is_verified: item.is_verified,
      is_ambiguous: item.is_ambiguous,
      confidence: item.confidence,
      confidence_score: item.confidence_score ? Number(item.confidence_score) : null,
      match_signals: item.match_signals ?? [],
      detected_document_type: item.detected_document_type,
      received_at: item.received_at,
      review_action: item.review_action,
      reviewed_at: item.reviewed_at,
      reviewed_by: item.reviewed_by ? fullName(item.reviewed_by) || item.reviewed_by.email : null,
      review_note: item.review_note,
      failure_reason: item.failure_reason,
      client: item.detected_client
        ? {
            id: item.detected_client.id,
            name: `${item.detected_client.first_name} ${item.detected_client.last_name}`,
            company: item.detected_client.company,
          }
        : null,
      suggested_assignment: item.suggested_assignment
        ? { id: item.suggested_assignment.id, form_name: item.suggested_assignment.form.name }
        : null,
      suggested_requirement: item.suggested_requirement
        ? {
            id: item.suggested_requirement.id,
            name: item.suggested_requirement.document_requirement.name,
            status: item.suggested_requirement.status,
            requires_approval: item.suggested_requirement.document_requirement.requires_approval,
          }
        : null,
      public_submission: item.public_submission,
      document: item.document ? mapDocument(item.document) : null,
    };
  }

  private async load(ws: WorkspaceContext, id: string) {
    const item = await this.prisma.documentInboxItem.findFirst({ where: { id, ...this.scope(ws) }, include: ITEM_INCLUDE });
    if (!item) throw new NotFoundException('Inbox item not found');
    return item;
  }

  async get(ws: WorkspaceContext, id: string) {
    const item = await this.load(ws, id);
    // Candidate requirements for "change": open requirements of the detected (or any) client.
    const candidates = item.detected_client_id
      ? await this.prisma.assignmentRequirement.findMany({
          where: { organization_id: ws.organization_id, assignment: { client_id: item.detected_client_id, cancelled_at: null } },
          include: { document_requirement: { select: { name: true } }, assignment: { select: { id: true, form: { select: { name: true } } } } },
          orderBy: { created_at: 'desc' },
          take: 100,
        })
      : [];
    return {
      ...this.map(item),
      candidate_requirements: candidates.map((c) => ({
        id: c.id,
        name: c.document_requirement.name,
        status: c.status,
        assignment_id: c.assignment.id,
        form_name: c.assignment.form.name,
      })),
    };
  }

  /** Requirements of any client the employee can access (for re-assigning an item). */
  async requirementsForClient(ws: WorkspaceContext, clientId: string) {
    await this.access.assertClient(ws, clientId);
    const rows = await this.prisma.assignmentRequirement.findMany({
      where: { organization_id: ws.organization_id, assignment: { client_id: clientId, cancelled_at: null } },
      include: { document_requirement: { select: { name: true } }, assignment: { select: { id: true, form: { select: { name: true } } } } },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((c) => ({ id: c.id, name: c.document_requirement.name, status: c.status, assignment_id: c.assignment.id, form_name: c.assignment.form.name }));
  }

  async resolve(ws: WorkspaceContext, id: string, dto: ResolveInboxItemDto) {
    const item = await this.load(ws, id);
    if (!item.needs_review && dto.action !== 'change') throw new BadRequestException('This item has already been resolved');
    if (!item.document_id) throw new BadRequestException('This item has no document');

    if (dto.action === 'approve' || dto.action === 'reject') {
      if (!item.document.assignment_requirement_id) {
        throw new BadRequestException('Confirm the client and requirement first');
      }
      await this.documents.review(
        ws,
        item.document_id,
        { decision: dto.action === 'approve' ? 'APPROVED' : 'REJECTED', reason: dto.reason },
        'inbox',
      );
      return this.get(ws, id);
    }

    if (dto.action === 'dismiss') {
      await this.prisma.$transaction(async (tx) => {
        await tx.documentInboxItem.update({
          where: { id: item.id },
          data: {
            needs_review: false,
            processing_status: InboxProcessingStatus.RESOLVED,
            review_action: InboxReviewAction.DISMISSED,
            reviewed_by_user_id: ws.user_id,
            reviewed_at: new Date(),
            review_note: dto.note ?? dto.reason ?? null,
          },
        });
        if (item.public_submission_id) {
          await tx.publicSubmission.update({
            where: { id: item.public_submission_id },
            data: { status: PublicSubmissionStatus.DISMISSED, reviewed_by_user_id: ws.user_id, reviewed_at: new Date() },
          });
        }
        await this.activity.log(
          {
            organizationId: ws.organization_id,
            action: 'inbox.dismissed',
            entityType: 'document_inbox_item',
            entityId: item.id,
            documentId: item.document_id,
            clientId: item.detected_client_id,
            actorUserId: ws.user_id,
            description: `Dismissed ${item.document.original_filename} from the Document Inbox`,
          },
          tx,
        );
      });
      await this.cache.invalidateOrganization(ws.organization_id);
      return this.get(ws, id);
    }

    // confirm / change → link the document to a requirement.
    const requirementId = dto.action === 'confirm' ? item.suggested_requirement_id : dto.assignment_requirement_id;
    if (!requirementId) throw new BadRequestException('Choose the client requirement this document satisfies');
    await this.access.assertRequirement(ws, requirementId);
    await this.link(ws, item, requirementId, dto.action === 'confirm' ? InboxReviewAction.CONFIRMED : InboxReviewAction.CHANGED);
    return this.get(ws, id);
  }

  /** Attaches the item's document to a requirement as its newest submission (history preserved). */
  private async link(
    ws: WorkspaceContext,
    item: Prisma.DocumentInboxItemGetPayload<{ include: typeof ITEM_INCLUDE }>,
    requirementId: string,
    action: InboxReviewAction,
  ) {
    const ar = await this.prisma.assignmentRequirement.findUnique({
      where: { id: requirementId },
      include: { document_requirement: true, assignment: { select: { id: true, client_id: true } } },
    });
    if (!ar || ar.organization_id !== ws.organization_id) throw new NotFoundException('Requirement not found');
    if (item.document.assignment_requirement_id === ar.id) {
      throw new BadRequestException('The document is already linked to this requirement');
    }
    if (!ws.permissions.includes(Permission.CLIENTS_VIEW_ALL) && item.detected_client_id && item.detected_client_id !== ar.assignment.client_id) {
      throw new ForbiddenException('Not allowed');
    }
    const previousAssignmentId = item.document.assignment_id;

    await this.prisma.$transaction(async (tx) => {
      const previous = await tx.document.findMany({
        where: { assignment_requirement_id: ar.id, superseded_at: null, deleted_at: null, id: { not: item.document_id } },
        orderBy: { uploaded_at: 'desc' },
      });
      for (let i = 0; i < previous.length; i++) {
        await tx.document.update({
          where: { id: previous[i].id },
          data: { superseded_at: new Date(), superseded_by_id: i === 0 ? item.document_id : null },
        });
      }
      // If it was the current submission of another requirement, release that one.
      if (item.document.assignment_requirement_id) {
        await tx.assignmentRequirement.updateMany({
          where: { id: item.document.assignment_requirement_id, current_document_id: item.document_id },
          data: { current_document_id: null },
        });
      }
      const requiresApproval = ar.document_requirement.requires_approval;
      await tx.document.update({
        where: { id: item.document_id },
        data: {
          client_id: ar.assignment.client_id,
          assignment_id: ar.assignment.id,
          assignment_requirement_id: ar.id,
          document_requirement_id: ar.document_requirement_id,
          title: ar.document_requirement.name,
          is_verified: true,
          review_status: requiresApproval ? ReviewStatus.PENDING : ReviewStatus.APPROVED,
          reviewed_by_user_id: requiresApproval ? null : ws.user_id,
          reviewed_at: requiresApproval ? null : new Date(),
        },
      });
      await tx.assignmentRequirement.update({
        where: { id: ar.id },
        data: { current_document_id: item.document_id, status: RequirementStatus.UNDER_REVIEW },
      });
      await tx.formAssignment.update({ where: { id: ar.assignment.id }, data: { last_submission_at: new Date() } });
      await tx.documentInboxItem.update({
        where: { id: item.id },
        data: {
          detected_client_id: ar.assignment.client_id,
          detected_document_type: ar.document_requirement.name,
          suggested_assignment_id: ar.assignment.id,
          suggested_requirement_id: ar.id,
          resolved_client_id: ar.assignment.client_id,
          resolved_assignment_id: ar.assignment.id,
          resolved_requirement_id: ar.id,
          review_action: action,
          reviewed_by_user_id: ws.user_id,
          reviewed_at: new Date(),
          is_verified: true,
          // Still awaiting approval when the requirement requires it.
          needs_review: requiresApproval,
          requires_approval: requiresApproval,
          processing_status: requiresApproval ? InboxProcessingStatus.MATCHED : InboxProcessingStatus.RESOLVED,
        },
      });
      if (item.public_submission_id) {
        await tx.publicSubmission.update({
          where: { id: item.public_submission_id },
          data: {
            status: PublicSubmissionStatus.ACCEPTED,
            resolved_client_id: ar.assignment.client_id,
            resolved_assignment_id: ar.assignment.id,
            reviewed_by_user_id: ws.user_id,
            reviewed_at: new Date(),
          },
        });
      }
      await this.activity.log(
        {
          organizationId: ws.organization_id,
          action: action === InboxReviewAction.CONFIRMED ? 'inbox.match_confirmed' : 'inbox.match_changed',
          entityType: 'document_inbox_item',
          entityId: item.id,
          documentId: item.document_id,
          clientId: ar.assignment.client_id,
          assignmentId: ar.assignment.id,
          actorUserId: ws.user_id,
          description: `${action === InboxReviewAction.CONFIRMED ? 'Confirmed' : 'Linked'} ${item.document.original_filename} as ${ar.document_requirement.name}`,
        },
        tx,
      );
      await this.progress.recalcAssignment(ar.assignment.id, tx);
      if (previousAssignmentId && previousAssignmentId !== ar.assignment.id) {
        await this.progress.recalcAssignment(previousAssignmentId, tx);
      }
    });
    await this.cache.invalidateOrganization(ws.organization_id);
  }
}

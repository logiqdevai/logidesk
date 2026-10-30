import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequirementStatus, UploadSource } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { PortalContext } from '@/shared/auth/interfaces/auth-context.interface';
import { addDays, toIsoDate } from '@/shared/utils/dates/dates.utils';
import { ActivityService } from '@/modules/activity/activity.service';
import { AssignmentsService } from '@/modules/assignments/services/assignments.service';
import { ProgressService } from '@/modules/assignments/services/progress.service';
import { DocumentIntakeService } from '@/modules/documents/services/document-intake.service';
import { DOCUMENT_INCLUDE, mapDocument } from '@/modules/documents/utils/document.mapper';
import { UploadedFile } from '@/modules/documents/utils/file-validation.utils';
import { SaveAnswersDto } from '@/modules/assignments/dto/assignment.dto';

/** Client portal: a client only ever sees their own forms and documents. */
@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly assignments: AssignmentsService,
    private readonly progress: ProgressService,
    private readonly intake: DocumentIntakeService,
    private readonly activity: ActivityService,
  ) {}

  async me(portal: PortalContext) {
    const [client, clientUser, org] = await Promise.all([
      this.prisma.client.findUnique({ where: { id: portal.client_id } }),
      this.prisma.clientUser.findUnique({ where: { id: portal.client_user_id } }),
      this.prisma.organization.findUnique({
        where: { id: portal.organization_id },
        include: { portal_settings: true },
      }),
    ]);
    const logo = org.logo_storage_key
      ? await this.storage.signedUrl(org.logo_storage_key, { disposition: 'inline', expiresInSeconds: 3600 }).catch(() => null)
      : null;
    return {
      client: {
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        tax_id: client.tax_id,
        address: client.address,
      },
      account: {
        email: clientUser.email,
        notify_reminders: clientUser.notify_reminders,
        notify_review_updates: clientUser.notify_review_updates,
        activated_at: clientUser.activated_at,
      },
      organization: {
        id: org.id,
        name: org.name,
        logo_url: logo,
        contact_email: org.contact_email,
        contact_phone: org.contact_phone,
        welcome_message: org.portal_settings?.welcome_message ?? null,
        accent_color: org.portal_settings?.accent_color ?? null,
      },
    };
  }

  async overview(portal: PortalContext) {
    const today = await this.progress.today(portal.organization_id);
    const soon = addDays(today, 30);
    const [assignments, requirements] = await Promise.all([
      this.listForms(portal),
      this.prisma.assignmentRequirement.findMany({
        where: { organization_id: portal.organization_id, assignment: { client_id: portal.client_id, cancelled_at: null } },
        include: {
          document_requirement: { select: { name: true, is_required: true } },
          assignment: { select: { id: true, deadline: true, form: { select: { name: true } } } },
          current_document: { select: { expiration_date: true, rejection_reason: true, uploaded_at: true } },
        },
      }),
    ]);
    const active = requirements.filter((r) => r.status !== RequirementStatus.NOT_REQUIRED);
    const pick = (...s: RequirementStatus[]) => active.filter((r) => s.includes(r.status));
    const item = (r: (typeof requirements)[number]) => ({
      assignment_requirement_id: r.id,
      assignment_id: r.assignment.id,
      name: r.document_requirement.name,
      form_name: r.assignment.form.name,
      status: r.status,
      is_required: r.document_requirement.is_required,
      deadline: toIsoDate(r.deadline ?? r.assignment.deadline),
      expiration_date: toIsoDate(r.current_document?.expiration_date),
      rejection_reason: r.current_document?.rejection_reason ?? null,
    });
    const expiring = active.filter(
      (r) =>
        r.status === RequirementStatus.APPROVED &&
        r.current_document?.expiration_date &&
        r.current_document.expiration_date >= today &&
        r.current_document.expiration_date <= soon,
    );
    // The single most important next action, in priority order.
    const actions = [
      ...pick(RequirementStatus.REJECTED).map((r) => ({ ...item(r), kind: 'rejected' })),
      ...pick(RequirementStatus.EXPIRED).map((r) => ({ ...item(r), kind: 'expired' })),
      ...pick(RequirementStatus.MISSING)
        .filter((r) => r.document_requirement.is_required)
        .sort((a, b) => ((a.deadline ?? a.assignment.deadline)?.getTime() ?? Infinity) - ((b.deadline ?? b.assignment.deadline)?.getTime() ?? Infinity))
        .map((r) => ({ ...item(r), kind: 'missing' })),
      ...expiring.map((r) => ({ ...item(r), kind: 'expiring' })),
      ...pick(RequirementStatus.UNDER_REVIEW, RequirementStatus.SUBMITTED).map((r) => ({ ...item(r), kind: 'awaiting_review' })),
    ];
    const approved = pick(RequirementStatus.APPROVED).length;
    return {
      progress: {
        total: active.length,
        approved,
        percent: active.length ? Math.round((approved / active.length) * 100) : 0,
        missing: pick(RequirementStatus.MISSING).length,
        awaiting_review: pick(RequirementStatus.UNDER_REVIEW, RequirementStatus.SUBMITTED).length,
        rejected: pick(RequirementStatus.REJECTED).length,
        expired: pick(RequirementStatus.EXPIRED).length,
        expiring_soon: expiring.length,
      },
      next_actions: actions.slice(0, 12),
      forms: assignments,
    };
  }

  async listForms(portal: PortalContext) {
    const rows = await this.prisma.formAssignment.findMany({
      where: { organization_id: portal.organization_id, client_id: portal.client_id, cancelled_at: null },
      orderBy: { assigned_at: 'desc' },
      include: { form_version: { select: { title: true, description: true } }, response: { select: { status: true, last_saved_at: true } } },
    });
    return rows.map((a) => ({
      id: a.id,
      title: a.form_version.title,
      description: a.form_version.description,
      assigned_at: a.assigned_at,
      deadline: toIsoDate(a.deadline),
      status: a.status,
      progress_percent: a.progress_percent,
      requirements_total: a.requirements_total,
      requirements_completed: a.requirements_completed,
      requirements_missing: a.requirements_missing,
      requirements_expired: a.requirements_expired,
      response_status: a.response?.status ?? 'DRAFT',
      last_saved_at: a.response?.last_saved_at ?? null,
    }));
  }

  private async assertAssignment(portal: PortalContext, assignmentId: string) {
    const a = await this.prisma.formAssignment.findFirst({
      where: { id: assignmentId, organization_id: portal.organization_id, client_id: portal.client_id, cancelled_at: null },
      select: { id: true },
    });
    if (!a) throw new NotFoundException('Form not found');
  }

  async form(portal: PortalContext, assignmentId: string) {
    await this.assertAssignment(portal, assignmentId);
    return this.assignments.detail(portal.organization_id, assignmentId, { portal: true });
  }

  async saveAnswers(portal: PortalContext, assignmentId: string, dto: SaveAnswersDto, ip?: string) {
    await this.assertAssignment(portal, assignmentId);
    await this.assignments.saveAnswers(portal.organization_id, assignmentId, dto, { clientUserId: portal.client_user_id }, ip);
    return this.form(portal, assignmentId);
  }

  async upload(portal: PortalContext, assignmentId: string, requirementId: string, files: UploadedFile[], ip?: string) {
    await this.assertAssignment(portal, assignmentId);
    const ar = await this.prisma.assignmentRequirement.findFirst({ where: { id: requirementId, assignment_id: assignmentId } });
    if (!ar) throw new NotFoundException('Document request not found');
    await this.intake.submitToRequirement({
      organizationId: portal.organization_id,
      assignmentRequirementId: requirementId,
      files,
      source: UploadSource.CLIENT_PORTAL,
      actor: { clientUserId: portal.client_user_id },
      enforceSubmissionRules: true,
      ip,
    });
    return this.form(portal, assignmentId);
  }

  async documents(portal: PortalContext) {
    const docs = await this.prisma.document.findMany({
      where: { organization_id: portal.organization_id, client_id: portal.client_id, deleted_at: null, is_verified: true },
      include: {
        ...DOCUMENT_INCLUDE,
        assignment: { select: { id: true, cancelled_at: true, form_version: { select: { title: true } } } },
        assignment_requirement: { select: { status: true } },
      },
      orderBy: { uploaded_at: 'desc' },
    });
    return docs
      .filter((d) => !d.assignment?.cancelled_at)
      .map((d) => {
        const mapped = mapDocument(d);
        return {
          id: mapped.id,
          title: mapped.title,
          original_filename: mapped.original_filename,
          file_format: mapped.file_format,
          size_bytes: mapped.size_bytes,
          uploaded_at: mapped.uploaded_at,
          uploaded_by_type: mapped.uploaded_by_type,
          expiration_date: mapped.expiration_date,
          review_status: mapped.review_status,
          rejection_reason: mapped.rejection_reason,
          is_current: mapped.is_current,
          status: mapped.is_current ? (d.assignment_requirement?.status ?? null) : 'REPLACED',
          assignment_id: d.assignment?.id ?? null,
          form_name: d.assignment?.form_version.title ?? null,
        };
      });
  }

  async documentUrl(portal: PortalContext, documentId: string, disposition: 'inline' | 'attachment') {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, organization_id: portal.organization_id, client_id: portal.client_id, deleted_at: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const url = await this.storage.signedUrl(doc.storage_key, {
      disposition,
      filename: doc.original_filename,
      contentType: doc.mime_type,
      expiresInSeconds: 300,
    });
    return { url, expires_in: 300 };
  }

  async updateAccount(portal: PortalContext, dto: { notify_reminders?: boolean; notify_review_updates?: boolean }) {
    await this.prisma.clientUser.update({
      where: { id: portal.client_user_id },
      data: { notify_reminders: dto.notify_reminders, notify_review_updates: dto.notify_review_updates },
    });
    return this.me(portal);
  }

  /** Clients can keep their contact details up to date; changes are audited. */
  async updateInformation(portal: PortalContext, dto: { phone?: string | null; address?: string | null }) {
    const client = await this.prisma.client.findUnique({ where: { id: portal.client_id } });
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (dto.phone !== undefined && dto.phone !== client.phone) changes.phone = { from: client.phone, to: dto.phone };
    if (dto.address !== undefined && dto.address !== client.address) changes.address = { from: client.address, to: dto.address };
    if (!Object.keys(changes).length) return this.me(portal);
    if (dto.phone && dto.phone.length > 40) throw new BadRequestException('Phone number is too long');
    await this.prisma.client.update({ where: { id: client.id }, data: { phone: dto.phone, address: dto.address } });
    await this.activity.log({
      organizationId: portal.organization_id,
      action: 'client.updated',
      entityType: 'client',
      entityId: client.id,
      clientId: client.id,
      actorClientUserId: portal.client_user_id,
      description: `Client updated ${Object.keys(changes).join(' and ')} in the portal`,
      metadata: { changes },
    });
    return this.me(portal);
  }
}

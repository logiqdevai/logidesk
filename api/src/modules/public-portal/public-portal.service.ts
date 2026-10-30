import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DocumentVersionChangeType,
  FormFieldType,
  FormStatus,
  FormVersionStatus,
  PortalAccessMode,
  Prisma,
  ReviewStatus,
  UploadSource,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { DocumentIntakeService } from '@/modules/documents/services/document-intake.service';
import { UploadedFile, validateUpload } from '@/modules/documents/utils/file-validation.utils';
import { allFields, FormDefinition, isFieldVisible, validateAnswers } from '@/modules/forms/utils/form-definition.utils';

/**
 * Public portal (Settings > Client Portal = "Public portal for everyone"). Anyone with the
 * unguessable link can submit publicly shared forms; submissions are unverified and land in
 * the Document Inbox for review. No client record is ever exposed here.
 */
@Injectable()
export class PublicPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly intake: DocumentIntakeService,
    private readonly activity: ActivityService,
  ) {}

  private async portal(slug: string) {
    const settings = await this.prisma.organizationPortalSettings.findFirst({
      where: { public_slug: slug, access_mode: PortalAccessMode.PUBLIC, organization: { deleted_at: null } },
      include: { organization: { select: { id: true, name: true, logo_storage_key: true } } },
    });
    if (!settings) throw new NotFoundException('This portal link is not available');
    return settings;
  }

  async overview(slug: string) {
    const settings = await this.portal(slug);
    const forms = await this.prisma.form.findMany({
      where: { organization_id: settings.organization_id, is_public: true, status: FormStatus.PUBLISHED, deleted_at: null },
      include: { current_version: { select: { title: true, description: true, document_count: true, field_count: true } } },
      orderBy: { name: 'asc' },
    });
    const logo = settings.organization.logo_storage_key
      ? await this.storage.signedUrl(settings.organization.logo_storage_key, { disposition: 'inline', expiresInSeconds: 3600 }).catch(() => null)
      : null;
    return {
      organization: { name: settings.organization.name, logo_url: logo },
      welcome_message: settings.welcome_message,
      accent_color: settings.accent_color,
      forms: forms.map((f) => ({
        id: f.id,
        title: f.current_version?.title ?? f.name,
        description: f.current_version?.description ?? f.description,
        document_count: f.current_version?.document_count ?? 0,
        field_count: f.current_version?.field_count ?? 0,
      })),
    };
  }

  private async publicForm(slug: string, formId: string) {
    const settings = await this.portal(slug);
    const form = await this.prisma.form.findFirst({
      where: { id: formId, organization_id: settings.organization_id, is_public: true, status: FormStatus.PUBLISHED, deleted_at: null },
      include: { current_version: { include: { document_requirements: { orderBy: { sort_order: 'asc' } } } } },
    });
    if (!form || form.current_version?.status !== FormVersionStatus.PUBLISHED) throw new NotFoundException('Form not found');
    return { settings, form, version: form.current_version };
  }

  async form(slug: string, formId: string) {
    const { settings, version } = await this.publicForm(slug, formId);
    return {
      id: formId,
      organization_name: settings.organization.name,
      accent_color: settings.accent_color,
      title: version.title,
      description: version.description,
      instructions: version.instructions,
      definition: version.definition,
      requirements: version.document_requirements.map((r) => ({
        field_key: r.field_key,
        name: r.name,
        description: r.description,
        instructions: r.instructions,
        is_required: r.is_required,
        accepted_formats: r.accepted_formats,
        max_file_size_mb: r.max_file_size_mb,
        max_files: r.max_files,
      })),
    };
  }

  async submit(
    slug: string,
    formId: string,
    body: { submitter_name?: string; submitter_email?: string; submitter_company?: string; answers?: string },
    files: Array<UploadedFile & { fieldname: string }>,
    ip: string,
  ) {
    const { settings, form, version } = await this.publicForm(slug, formId);
    const name = body.submitter_name?.trim();
    const email = body.submitter_email?.trim().toLowerCase();
    if (!name) throw new BadRequestException({ message: 'Enter your name', errors: { submitter_name: 'Enter your name' } });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException({ message: 'Enter a valid email address', errors: { submitter_email: 'Enter a valid email address' } });
    }
    let answers: Record<string, unknown> = {};
    try {
      answers = body.answers ? JSON.parse(body.answers) : {};
    } catch {
      throw new BadRequestException('Answers could not be read');
    }
    const definition = version.definition as unknown as FormDefinition;
    const { values, errors } = validateAnswers(definition, answers, { requireComplete: true });

    // Files arrive as "file_<field_key>" parts.
    const byField = new Map<string, Array<UploadedFile & { fieldname: string }>>();
    for (const f of files ?? []) {
      const key = f.fieldname.replace(/^file_/, '');
      byField.set(key, [...(byField.get(key) ?? []), f]);
    }
    const visibleFileFields = allFields(definition).filter(
      (f) => f.type === FormFieldType.FILE_UPLOAD && isFieldVisible(f, values, definition),
    );
    const validated = new Map<string, Array<{ format: any; mime: string }>>();
    for (const req of version.document_requirements) {
      const field = visibleFileFields.find((f) => f.id === req.field_key);
      const list = byField.get(req.field_key) ?? [];
      if (!field) continue;
      if (req.is_required && !list.length) errors[req.field_key] = `Upload ${req.name}`;
      if (list.length > req.max_files) errors[req.field_key] = `Upload at most ${req.max_files} file(s)`;
      try {
        validated.set(req.field_key, list.map((f) => validateUpload(f, { accepted: req.accepted_formats, maxSizeMb: req.max_file_size_mb })));
      } catch (e) {
        errors[req.field_key] = e.message;
      }
    }
    if (Object.keys(errors).length) throw new BadRequestException({ message: 'Please fix the highlighted fields', errors });
    const total = [...byField.values()].flat().reduce((s, f) => s + f.size, 0);
    await this.intake.assertStorageQuota(settings.organization_id, total);

    const submissionId = randomUUID();
    const stored: string[] = [];
    try {
      const uploads: Array<{ key: string; file: UploadedFile; req: (typeof version.document_requirements)[number]; v: { format: any; mime: string } }> = [];
      for (const req of version.document_requirements) {
        const list = byField.get(req.field_key) ?? [];
        const checks = validated.get(req.field_key) ?? [];
        for (let i = 0; i < list.length; i++) {
          const key = this.storage.buildKey(settings.organization_id, `public/${submissionId}`, list[i].originalname);
          await this.storage.put(key, list[i].buffer, checks[i].mime);
          stored.push(key);
          uploads.push({ key, file: list[i], req, v: checks[i] });
        }
      }
      const result = await this.prisma.$transaction(async (tx) => {
        const submission = await tx.publicSubmission.create({
          data: {
            organization_id: settings.organization_id,
            form_id: form.id,
            form_version_id: version.id,
            submitter_name: name.slice(0, 160),
            submitter_email: email,
            submitter_company: body.submitter_company?.trim().slice(0, 160) || null,
            answers: values as Prisma.InputJsonValue,
            ip_address: ip,
          },
        });
        const docs = [];
        for (const u of uploads) {
          const doc = await tx.document.create({
            data: {
              organization_id: settings.organization_id,
              public_submission_id: submission.id,
              document_requirement_id: u.req.id,
              title: u.req.name,
              original_filename: u.file.originalname.slice(0, 255),
              storage_key: u.key,
              storage_bucket: this.storage.bucket,
              mime_type: u.v.mime,
              file_format: u.v.format,
              size_bytes: u.file.size,
              source: UploadSource.PUBLIC_PORTAL,
              review_status: ReviewStatus.PENDING,
              is_verified: false,
              metadata: { field_key: u.req.field_key, submission_id: submission.id, processed: false } as Prisma.InputJsonValue,
            },
          });
          await tx.documentVersion.create({
            data: {
              organization_id: settings.organization_id,
              document_id: doc.id,
              version_number: 1,
              change_type: DocumentVersionChangeType.CREATED,
              original_filename: doc.original_filename,
              storage_key: doc.storage_key,
              mime_type: doc.mime_type,
              size_bytes: doc.size_bytes,
              review_status: doc.review_status,
              change_reason: 'Public portal submission (unverified)',
            },
          });
          docs.push(doc);
        }
        await this.activity.log(
          {
            organizationId: settings.organization_id,
            action: 'public_portal.submitted',
            entityType: 'public_submission',
            entityId: submission.id,
            description: `${name} (${email}) submitted "${version.title}" through the public portal with ${docs.length} file(s)`,
            ipAddress: ip,
          },
          tx,
        );
        return { submission, docs };
      });
      for (const doc of result.docs) await this.intake.enqueueProcessing(settings.organization_id, doc.id);
      return { success: true, reference: result.submission.id.slice(0, 8).toUpperCase(), files: result.docs.length };
    } catch (error) {
      await Promise.all(stored.map((k) => this.storage.delete(k).catch(() => undefined)));
      throw error;
    }
  }
}

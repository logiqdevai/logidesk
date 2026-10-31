import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { NotificationChannel, OrganizationRole, PortalAccessMode, ReminderIntervalUnit } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { FormsService } from '@/modules/forms/services/forms.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { generateSlug } from '@/shared/utils/crypto/crypto.utils';
import { getDefaultTemplates } from '@/modules/notifications/utils/default-templates.constants';
import { UploadedFile, validateUpload } from '@/modules/documents/utils/file-validation.utils';
import { CreateOrganizationDto, UpdateDocumentSettingsDto, UpdateOrganizationDto, UpdatePortalSettingsDto } from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly forms: FormsService,
    private readonly storage: StorageService,
  ) {}

  /** Creates a workspace with its owner and every default (settings, templates, rules, starter forms). */
  async create(userId: string, dto: CreateOrganizationDto) {
    const timeZone = dto.time_zone && DateTime.local().setZone(dto.time_zone).isValid ? dto.time_zone : 'UTC';
    const base = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'workspace';
    const owner = await this.prisma.user.findUnique({ where: { id: userId }, select: { language: true, country: true } });
    // The country chosen at sign-up decides the language of the workspace defaults (Greece → Greek); otherwise the user's own language.
    const language = owner?.country === 'GR' || owner?.language === 'el' ? 'el' : 'en';
    const defaults = getDefaultTemplates(language);
    const org = await this.prisma.$transaction(
      async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.name,
            slug: `${base}-${generateSlug(4)}`,
            time_zone: timeZone,
            default_language: language,
            created_by_user_id: userId,
          },
        });
        await tx.organizationMember.create({
          data: { organization_id: organization.id, user_id: userId, role: OrganizationRole.OWNER },
        });
        await tx.organizationPortalSettings.create({ data: { organization_id: organization.id } });
        await tx.organizationDocumentSettings.create({ data: { organization_id: organization.id } });
        const schedule = await tx.reminderSchedule.create({
          data: {
            organization_id: organization.id,
            enabled: true,
            start_days_before: 7,
            interval_count: 3,
            interval_unit: ReminderIntervalUnit.DAYS,
            send_time: '09:00',
            overdue_enabled: true,
            overdue_interval_count: 1,
            overdue_interval_unit: ReminderIntervalUnit.WEEKS,
            overdue_max_count: 4,
          },
        });
        await tx.notificationSettings.create({
          data: {
            organization_id: organization.id,
            enabled_channels: [NotificationChannel.EMAIL],
            sender_name: dto.name,
            default_reminder_schedule_id: schedule.id,
            quiet_hours_start: '20:00',
            quiet_hours_end: '08:00',
          },
        });
        const templates = [];
        for (const t of defaults.templates) {
          templates.push(
            await tx.notificationTemplate.create({
              data: {
                organization_id: organization.id,
                type: t.type,
                channel: NotificationChannel.EMAIL,
                name: t.name,
                subject: t.subject,
                body: t.body,
                is_default: true,
                is_system: true,
              },
            }),
          );
        }
        for (const rule of defaults.automationRules) {
          await tx.automationRule.create({
            data: { organization_id: organization.id, is_system: true, enabled: true, channels: [NotificationChannel.EMAIL], ...rule },
          });
        }
        await this.forms.seedTemplates(tx, organization.id, userId, language);
        await this.activity.log(
          {
            organizationId: organization.id,
            action: 'organization.created',
            entityType: 'organization',
            entityId: organization.id,
            actorUserId: userId,
            description: `Created workspace ${organization.name}`,
          },
          tx,
        );
        return organization;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    return { id: org.id, name: org.name };
  }

  async get(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { portal_settings: true, document_settings: true },
    });
    if (!org) throw new NotFoundException('Workspace not found');
    const logo = org.logo_storage_key
      ? await this.storage.signedUrl(org.logo_storage_key, { disposition: 'inline', expiresInSeconds: 3600 }).catch(() => null)
      : null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo_url: logo,
      contact_email: org.contact_email,
      contact_phone: org.contact_phone,
      address: org.address,
      time_zone: org.time_zone,
      default_language: org.default_language,
      storage_limit_bytes: Number(org.storage_limit_bytes),
      created_at: org.created_at,
      portal_settings: org.portal_settings,
      document_settings: org.document_settings
        ? {
            ...org.document_settings,
            match_high_threshold: Number(org.document_settings.match_high_threshold),
            match_medium_threshold: Number(org.document_settings.match_medium_threshold),
          }
        : null,
    };
  }

  async update(ws: WorkspaceContext, dto: UpdateOrganizationDto) {
    if (dto.time_zone && !DateTime.local().setZone(dto.time_zone).isValid) throw new BadRequestException('Unknown time zone');
    await this.prisma.organization.update({ where: { id: ws.organization_id }, data: dto });
    await this.audit(ws, 'settings.organization_updated', 'Updated organization settings', dto);
    return this.get(ws.organization_id);
  }

  async uploadLogo(ws: WorkspaceContext, file: UploadedFile) {
    if (!file) throw new BadRequestException('Choose an image');
    const { mime } = validateUpload(file, { accepted: ['IMAGE'], maxSizeMb: 2 });
    const key = this.storage.buildKey(ws.organization_id, 'branding', file.originalname);
    await this.storage.put(key, file.buffer, mime);
    const previous = await this.prisma.organization.findUnique({ where: { id: ws.organization_id }, select: { logo_storage_key: true } });
    await this.prisma.organization.update({ where: { id: ws.organization_id }, data: { logo_storage_key: key } });
    if (previous?.logo_storage_key) await this.storage.delete(previous.logo_storage_key).catch(() => undefined);
    await this.audit(ws, 'settings.logo_updated', 'Updated the organization logo');
    return this.get(ws.organization_id);
  }

  async updatePortal(ws: WorkspaceContext, dto: UpdatePortalSettingsDto) {
    const current = await this.prisma.organizationPortalSettings.findUnique({ where: { organization_id: ws.organization_id } });
    const { regenerate_public_link, ...data } = dto;
    const mode = data.access_mode ?? current.access_mode;
    const needsSlug = mode === PortalAccessMode.PUBLIC && (!current.public_slug || regenerate_public_link);
    await this.prisma.organizationPortalSettings.update({
      where: { organization_id: ws.organization_id },
      data: { ...data, ...(needsSlug ? { public_slug: generateSlug(12) } : {}) },
    });
    await this.audit(ws, 'settings.portal_updated', `Updated client portal settings${data.access_mode ? ` (mode: ${data.access_mode.toLowerCase()})` : ''}`, dto);
    return this.get(ws.organization_id);
  }

  async updateDocuments(ws: WorkspaceContext, dto: UpdateDocumentSettingsDto) {
    await this.prisma.organizationDocumentSettings.update({ where: { organization_id: ws.organization_id }, data: dto });
    await this.audit(ws, 'settings.documents_updated', 'Updated document settings', dto);
    return this.get(ws.organization_id);
  }

  private audit(ws: WorkspaceContext, action: string, description: string, metadata?: object) {
    return this.activity.log({
      organizationId: ws.organization_id,
      action,
      entityType: 'organization',
      entityId: ws.organization_id,
      actorUserId: ws.user_id,
      description,
      metadata: metadata as Record<string, unknown>,
    });
  }
}

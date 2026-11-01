import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ExpirationPolicy,
  FormFieldType,
  FormStatus,
  FormVersion,
  FormVersionStatus,
  Prisma,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { dateOnly, toIsoDate } from '@/shared/utils/dates/dates.utils';
import { paginate } from '@/shared/utils/pagination/pagination.utils';
import {
  allFields,
  countDefinition,
  FormDefinition,
  parseDefinition,
  ScheduleInput,
  ScheduleInputSchema,
} from '../utils/form-definition.utils';
import { CreateFormDto, DuplicateFormDto, FormQueryType, UpdateFormDto } from '../dto/form.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(organizationId: string, query: FormQueryType) {
    const where: Prisma.FormWhereInput = { organization_id: organizationId, deleted_at: null };
    if (query.status !== 'all') where.status = query.status as FormStatus;
    else where.status = { not: FormStatus.ARCHIVED };
    if (query.template !== 'all') where.is_template = query.template === 'true';
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [forms, total] = await Promise.all([
      this.prisma.form.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          current_version: { select: { field_count: true, document_count: true, status: true, updated_at: true } },
          _count: { select: { assignments: { where: { cancelled_at: null } } } },
        },
      }),
      this.prisma.form.count({ where }),
    ]);
    return paginate(
      forms.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        status: f.status,
        is_template: f.is_template,
        is_public: f.is_public,
        field_count: f.current_version?.field_count ?? 0,
        document_count: f.current_version?.document_count ?? 0,
        assignment_count: f._count.assignments,
        has_unpublished_changes: f.status === FormStatus.PUBLISHED && f.current_version?.status === FormVersionStatus.DRAFT,
        updated_at: f.updated_at,
        archived_at: f.archived_at,
      })),
      total,
      query.page,
      query.limit,
    );
  }

  /** Builder payload: always the latest version (versions are never exposed in the UI). */
  async get(organizationId: string, formId: string) {
    const form = await this.prisma.form.findFirst({
      where: { id: formId, organization_id: organizationId, deleted_at: null },
      include: {
        current_version: { include: { default_reminder_schedule: true } },
        _count: { select: { assignments: { where: { cancelled_at: null } } } },
      },
    });
    if (!form) throw new NotFoundException('Form not found');
    const v = form.current_version;
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      status: form.status,
      is_template: form.is_template,
      is_public: form.is_public,
      assignment_count: form._count.assignments,
      updated_at: form.updated_at,
      instructions: v?.instructions ?? null,
      definition: (v?.definition as unknown as FormDefinition) ?? { sections: [] },
      default_expiration_policy: v?.default_expiration_policy ?? ExpirationPolicy.MANUAL,
      default_expiration_days: v?.default_expiration_days ?? null,
      default_fixed_expiration_date: toIsoDate(v?.default_fixed_expiration_date),
      default_reminder: v?.default_reminder_schedule ? pickSchedule(v.default_reminder_schedule) : null,
      lock_after_submit: v?.lock_after_submit ?? true,
      field_count: v?.field_count ?? 0,
      document_count: v?.document_count ?? 0,
    };
  }

  async create(ws: WorkspaceContext, dto: CreateFormDto) {
    const definition = parseDefinition(dto.definition ?? defaultDefinition());
    const form = await this.prisma.$transaction(async (tx) => {
      const created = await tx.form.create({
        data: {
          organization_id: ws.organization_id,
          name: dto.name,
          description: dto.description ?? null,
          is_template: dto.is_template ?? false,
          is_public: dto.is_public ?? false,
          created_by_user_id: ws.user_id,
        },
      });
      const version = await this.createVersion(tx, ws.organization_id, created.id, 1, dto, definition, ws.user_id);
      await tx.form.update({ where: { id: created.id }, data: { current_version_id: version.id } });
      if (dto.publish) await this.publishVersion(tx, created.id, version, definition);
      return created;
    });
    await this.activity.log({
      organizationId: ws.organization_id,
      action: 'form.created',
      entityType: 'form',
      entityId: form.id,
      actorUserId: ws.user_id,
      description: `Created form "${form.name}"`,
    });
    return this.get(ws.organization_id, form.id);
  }

  /**
   * Saves the builder. A draft (never published) form is edited in place; a published version
   * is immutable, so saving creates and publishes the next version behind the scenes.
   * Existing assignments stay pinned to the version they were created with.
   */
  async update(ws: WorkspaceContext, formId: string, dto: UpdateFormDto) {
    const form = await this.prisma.form.findFirst({
      where: { id: formId, organization_id: ws.organization_id, deleted_at: null },
      include: { current_version: { include: { default_reminder_schedule: true } } },
    });
    if (!form) throw new NotFoundException('Form not found');
    if (form.status === FormStatus.ARCHIVED) throw new BadRequestException('Restore the form before editing it');
    const current = form.current_version;

    const contentChanged =
      dto.definition !== undefined ||
      dto.instructions !== undefined ||
      dto.default_expiration_policy !== undefined ||
      dto.default_expiration_days !== undefined ||
      dto.default_fixed_expiration_date !== undefined ||
      dto.default_reminder !== undefined ||
      dto.lock_after_submit !== undefined ||
      dto.name !== undefined ||
      dto.description !== undefined;

    const definition = parseDefinition(dto.definition ?? current?.definition ?? defaultDefinition());
    const merged: CreateFormDto = {
      name: dto.name ?? form.name,
      description: dto.description !== undefined ? dto.description : form.description,
      instructions: dto.instructions !== undefined ? dto.instructions : current?.instructions,
      default_expiration_policy: dto.default_expiration_policy ?? current?.default_expiration_policy,
      default_expiration_days:
        dto.default_expiration_days !== undefined ? dto.default_expiration_days : current?.default_expiration_days,
      lock_after_submit: dto.lock_after_submit ?? current?.lock_after_submit,
      default_fixed_expiration_date:
        dto.default_fixed_expiration_date !== undefined
          ? dto.default_fixed_expiration_date
          : toIsoDate(current?.default_fixed_expiration_date),
      default_reminder:
        dto.default_reminder !== undefined
          ? dto.default_reminder
          : current?.default_reminder_schedule
            ? pickSchedule(current.default_reminder_schedule)
            : null,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.form.update({
        where: { id: form.id },
        data: {
          name: merged.name,
          description: merged.description,
          is_template: dto.is_template ?? undefined,
          is_public: dto.is_public ?? undefined,
        },
      });
      if (!contentChanged && !dto.publish) return;

      if (current && current.status === FormVersionStatus.DRAFT) {
        const version = await this.updateDraftVersion(tx, ws.organization_id, current, merged, definition);
        if (dto.publish || form.status === FormStatus.PUBLISHED) await this.publishVersion(tx, form.id, version, definition);
      } else if (contentChanged) {
        const next = (current?.version_number ?? 0) + 1;
        const version = await this.createVersion(tx, ws.organization_id, form.id, next, merged, definition, ws.user_id);
        await tx.form.update({ where: { id: form.id }, data: { current_version_id: version.id } });
        await this.publishVersion(tx, form.id, version, definition);
      }
    });

    await this.activity.log({
      organizationId: ws.organization_id,
      action: dto.publish && form.status === FormStatus.DRAFT ? 'form.published' : 'form.updated',
      entityType: 'form',
      entityId: form.id,
      actorUserId: ws.user_id,
      description: dto.publish && form.status === FormStatus.DRAFT ? `Published form "${merged.name}"` : `Updated form "${merged.name}"`,
    });
    return this.get(ws.organization_id, form.id);
  }

  async publish(ws: WorkspaceContext, formId: string) {
    return this.update(ws, formId, { publish: true });
  }

  async duplicate(ws: WorkspaceContext, formId: string, dto: DuplicateFormDto) {
    const source = await this.get(ws.organization_id, formId);
    const copy = await this.create(ws, {
      name: dto.name || (source.is_template && !dto.is_template ? source.name : `${source.name} (copy)`),
      description: source.description ?? undefined,
      instructions: source.instructions ?? undefined,
      definition: source.definition as unknown as Record<string, unknown>,
      is_template: dto.is_template ?? false,
      default_expiration_policy: source.default_expiration_policy,
      default_expiration_days: source.default_expiration_days,
      default_fixed_expiration_date: source.default_fixed_expiration_date,
      default_reminder: source.default_reminder,
      lock_after_submit: source.lock_after_submit,
    });
    await this.prisma.form.update({ where: { id: copy.id }, data: { duplicated_from_id: source.id } });
    return copy;
  }

  async setArchived(ws: WorkspaceContext, formId: string, archived: boolean) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organization_id: ws.organization_id, deleted_at: null } });
    if (!form) throw new NotFoundException('Form not found');
    const hasPublished = await this.prisma.formVersion.count({ where: { form_id: form.id, status: FormVersionStatus.PUBLISHED } });
    await this.prisma.form.update({
      where: { id: form.id },
      data: archived
        ? { status: FormStatus.ARCHIVED, archived_at: new Date() }
        : { status: hasPublished ? FormStatus.PUBLISHED : FormStatus.DRAFT, archived_at: null },
    });
    await this.activity.log({
      organizationId: ws.organization_id,
      action: archived ? 'form.archived' : 'form.restored',
      entityType: 'form',
      entityId: form.id,
      actorUserId: ws.user_id,
      description: `${archived ? 'Archived' : 'Restored'} form "${form.name}"`,
    });
    return this.get(ws.organization_id, form.id);
  }

  // ── versions ────────────────────────────────────────────────────────────────

  private async createSchedule(tx: Tx, organizationId: string, input: ScheduleInput | Record<string, unknown> | null | undefined) {
    if (!input) return null;
    const parsed = ScheduleInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException('The reminder schedule is invalid');
    }
    const values = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== null && v !== undefined));
    if (!Object.keys(values).length) return null;
    const schedule = await tx.reminderSchedule.create({ data: { organization_id: organizationId, ...values } });
    return schedule.id;
  }

  private versionData(dto: CreateFormDto, definition: FormDefinition) {
    const counts = countDefinition(definition);
    return {
      title: dto.name,
      description: dto.description ?? null,
      instructions: dto.instructions ?? null,
      definition: definition as unknown as Prisma.InputJsonValue,
      default_expiration_policy: dto.default_expiration_policy ?? ExpirationPolicy.MANUAL,
      default_expiration_days: dto.default_expiration_days ?? null,
      lock_after_submit: dto.lock_after_submit ?? true,
      default_fixed_expiration_date: dateOnly(dto.default_fixed_expiration_date ?? null),
      ...counts,
    };
  }

  private async createVersion(
    tx: Tx,
    organizationId: string,
    formId: string,
    versionNumber: number,
    dto: CreateFormDto,
    definition: FormDefinition,
    userId: string | null,
  ): Promise<FormVersion> {
    const scheduleId = await this.createSchedule(tx, organizationId, dto.default_reminder);
    return tx.formVersion.create({
      data: {
        organization_id: organizationId,
        form_id: formId,
        version_number: versionNumber,
        status: FormVersionStatus.DRAFT,
        created_by_user_id: userId,
        default_reminder_schedule_id: scheduleId,
        ...this.versionData(dto, definition),
      },
    });
  }

  private async updateDraftVersion(
    tx: Tx,
    organizationId: string,
    version: FormVersion,
    dto: CreateFormDto,
    definition: FormDefinition,
  ): Promise<FormVersion> {
    if (version.default_reminder_schedule_id) {
      await tx.formVersion.update({ where: { id: version.id }, data: { default_reminder_schedule_id: null } });
      await tx.reminderSchedule.delete({ where: { id: version.default_reminder_schedule_id } }).catch(() => undefined);
    }
    const scheduleId = await this.createSchedule(tx, organizationId, dto.default_reminder);
    return tx.formVersion.update({
      where: { id: version.id },
      data: { ...this.versionData(dto, definition), default_reminder_schedule_id: scheduleId },
    });
  }

  /** Freezes a version and generates its document requirements from FILE_UPLOAD fields. */
  private async publishVersion(tx: Tx, formId: string, version: FormVersion, definition: FormDefinition) {
    const fileFields = allFields(definition).filter((f) => f.type === FormFieldType.FILE_UPLOAD);
    let order = 0;
    for (const field of fileFields) {
      const cfg = field.file!;
      const policy = cfg.expiration_policy ?? version.default_expiration_policy;
      const scheduleId = await this.createSchedule(tx, version.organization_id, cfg.reminder ?? null);
      await tx.documentRequirement.create({
        data: {
          organization_id: version.organization_id,
          form_version_id: version.id,
          field_key: field.id,
          name: field.label,
          description: field.help ?? null,
          instructions: cfg.instructions ?? null,
          is_required: field.required,
          sort_order: order++,
          accepted_formats: cfg.accepted_formats,
          max_file_size_mb: cfg.max_file_size_mb,
          max_files: cfg.max_files,
          allow_multiple_submissions: cfg.allow_multiple_submissions,
          requires_approval: cfg.requires_approval,
          expiration_policy: policy,
          expiration_days: cfg.expiration_policy ? (cfg.expiration_days ?? null) : version.default_expiration_days,
          fixed_expiration_date: cfg.expiration_policy
            ? dateOnly(cfg.fixed_expiration_date ?? null)
            : version.default_fixed_expiration_date,
          reminder_schedule_id: scheduleId,
        },
      });
    }
    await tx.formVersion.update({
      where: { id: version.id },
      data: { status: FormVersionStatus.PUBLISHED, published_at: new Date() },
    });
    await tx.form.update({ where: { id: formId }, data: { status: FormStatus.PUBLISHED } });
  }

  /** Seeds reusable templates for a brand-new workspace. */
  async seedTemplates(tx: Tx, organizationId: string, userId: string, language: 'en' | 'el' = 'en') {
    for (const template of STARTER_TEMPLATES.map((t) => localizeTemplate(t, language))) {
      const definition = parseDefinition(template.definition);
      const form = await tx.form.create({
        data: {
          organization_id: organizationId,
          name: template.name,
          description: template.description,
          is_template: true,
          created_by_user_id: userId,
        },
      });
      const version = await this.createVersion(
        tx,
        organizationId,
        form.id,
        1,
        { name: template.name, description: template.description, instructions: template.instructions },
        definition,
        userId,
      );
      await tx.form.update({ where: { id: form.id }, data: { current_version_id: version.id } });
      await this.publishVersion(tx, form.id, version, definition);
    }
  }
}

export function pickSchedule(s: Record<string, any>) {
  return {
    enabled: s.enabled,
    start_days_before: s.start_days_before,
    interval_count: s.interval_count,
    interval_unit: s.interval_unit,
    interval_weekday: s.interval_weekday,
    send_time: s.send_time,
    overdue_enabled: s.overdue_enabled,
    overdue_interval_count: s.overdue_interval_count,
    overdue_interval_unit: s.overdue_interval_unit,
    overdue_interval_weekday: s.overdue_interval_weekday,
    overdue_max_count: s.overdue_max_count,
  };
}

function defaultDefinition(): FormDefinition {
  return { sections: [{ id: 'section_1', title: 'Details', description: null, fields: [] }] };
}

const file = (accepted: string[], extra: Record<string, unknown> = {}) => ({
  accepted_formats: accepted,
  max_file_size_mb: 10,
  max_files: 1,
  allow_multiple_submissions: false,
  requires_approval: true,
  ...extra,
});

type StarterTemplate = { name: string; description: string; instructions: string; definition: unknown };

/** Greek text for the English starter templates, keyed by the English string. Ids and types are never translated. */
const STARTER_TEMPLATES_EL: Record<string, string> = {
  'Individual KYC Onboarding': 'Ταυτοποίηση Ιδιώτη (KYC)',
  'Identity and address verification for individual clients.': 'Επαλήθευση ταυτότητας και διεύθυνσης για ιδιώτες πελάτες.',
  'Please complete your details and upload clear copies of the requested documents.': 'Συμπληρώστε τα στοιχεία σας και ανεβάστε καθαρά αντίγραφα των ζητούμενων εγγράφων.',
  'Personal details': 'Προσωπικά στοιχεία',
  'Date of birth': 'Ημερομηνία γέννησης',
  Nationality: 'Υπηκοότητα',
  'Mobile phone': 'Κινητό τηλέφωνο',
  'Identity documents': 'Έγγραφα ταυτότητας',
  'Proof of identity': 'Απόδειξη ταυτότητας',
  'Passport or national ID card (both sides).': 'Διαβατήριο ή δελτίο ταυτότητας (και οι δύο όψεις).',
  'Proof of address': 'Απόδειξη διεύθυνσης',
  'Utility bill or bank statement from the last 3 months.': 'Λογαριασμός κοινής ωφέλειας ή αντίγραφο τραπεζικού λογαριασμού των τελευταίων 3 μηνών.',
  'Business Compliance Pack': 'Φάκελος Συμμόρφωσης Επιχείρησης',
  'Registration, tax clearance and insurance for companies.': 'Εγγραφή, φορολογική ενημερότητα και ασφάλιση για εταιρείες.',
  'Upload the latest version of each company document.': 'Ανεβάστε την πιο πρόσφατη έκδοση κάθε εταιρικού εγγράφου.',
  'Company details': 'Στοιχεία εταιρείας',
  'Registered company name': 'Επωνυμία εταιρείας',
  'Number of employees': 'Αριθμός εργαζομένων',
  'Is the company VAT registered?': 'Είναι η εταιρεία εγγεγραμμένη στον ΦΠΑ;',
  'VAT number': 'ΑΦΜ / Αριθμός ΦΠΑ',
  Documents: 'Έγγραφα',
  'Certificate of Incorporation': 'Πιστοποιητικό Σύστασης',
  'Tax Clearance Certificate': 'Φορολογική Ενημερότητα',
  'Public Liability Insurance': 'Ασφάλιση Αστικής Ευθύνης',
  'Employee Onboarding Checklist': 'Λίστα Ένταξης Νέου Εργαζομένου',
  'Contracts, ID and bank details for new hires.': 'Συμβάσεις, ταυτότητα και τραπεζικά στοιχεία για νέους εργαζομένους.',
  'Complete every section before your first day.': 'Συμπληρώστε όλες τις ενότητες πριν την πρώτη σας ημέρα.',
  Employee: 'Εργαζόμενος',
  'Start date': 'Ημερομηνία έναρξης',
  'Contract type': 'Τύπος σύμβασης',
  'Full-time': 'Πλήρης απασχόληση',
  'Part-time': 'Μερική απασχόληση',
  Contractor: 'Εξωτερικός συνεργάτης',
  'Bank account (IBAN)': 'Τραπεζικός λογαριασμός (IBAN)',
  'Signed employment contract': 'Υπογεγραμμένη σύμβαση εργασίας',
  'ID document': 'Έγγραφο ταυτότητας',
};

const TRANSLATABLE_KEYS = new Set(['name', 'description', 'instructions', 'title', 'label', 'help']);

/** Deep-copies a starter template, swapping user-facing strings for their Greek text when `language` is 'el'. */
function localizeTemplate(template: StarterTemplate, language: 'en' | 'el'): StarterTemplate {
  if (language !== 'el') return template;
  const tr = (s: string) => STARTER_TEMPLATES_EL[s] ?? s;
  const walk = (node: unknown, key?: string): unknown => {
    if (Array.isArray(node)) return node.map((n) => walk(n, key === 'options' ? 'options' : undefined));
    if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v, k)]));
    if (typeof node === 'string' && (key === 'options' || (key && TRANSLATABLE_KEYS.has(key)))) return tr(node);
    return node;
  };
  return walk(template) as StarterTemplate;
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'Individual KYC Onboarding',
    description: 'Identity and address verification for individual clients.',
    instructions: 'Please complete your details and upload clear copies of the requested documents.',
    definition: {
      sections: [
        {
          id: 'personal',
          title: 'Personal details',
          fields: [
            { id: 'date_of_birth', type: 'DATE', label: 'Date of birth', required: true },
            { id: 'nationality', type: 'SHORT_TEXT', label: 'Nationality', required: true },
            { id: 'phone', type: 'PHONE', label: 'Mobile phone', required: false },
          ],
        },
        {
          id: 'documents',
          title: 'Identity documents',
          fields: [
            {
              id: 'proof_of_identity',
              type: 'FILE_UPLOAD',
              label: 'Proof of identity',
              help: 'Passport or national ID card (both sides).',
              required: true,
              file: file(['PDF', 'IMAGE'], { expiration_policy: 'MANUAL' }),
            },
            {
              id: 'proof_of_address',
              type: 'FILE_UPLOAD',
              label: 'Proof of address',
              help: 'Utility bill or bank statement from the last 3 months.',
              required: true,
              file: file(['PDF', 'IMAGE'], { expiration_policy: 'FROM_UPLOAD_DATE', expiration_days: 90 }),
            },
          ],
        },
      ],
    },
  },
  {
    name: 'Business Compliance Pack',
    description: 'Registration, tax clearance and insurance for companies.',
    instructions: 'Upload the latest version of each company document.',
    definition: {
      sections: [
        {
          id: 'company',
          title: 'Company details',
          fields: [
            { id: 'legal_name', type: 'SHORT_TEXT', label: 'Registered company name', required: true },
            { id: 'employees', type: 'NUMBER', label: 'Number of employees', required: false, validation: { min: 0 } },
            {
              id: 'vat_registered',
              type: 'YES_NO',
              label: 'Is the company VAT registered?',
              required: true,
            },
            {
              id: 'vat_number',
              type: 'SHORT_TEXT',
              label: 'VAT number',
              required: true,
              visibility: { field_id: 'vat_registered', operator: 'equals', value: true },
            },
          ],
        },
        {
          id: 'documents',
          title: 'Documents',
          fields: [
            {
              id: 'incorporation',
              type: 'FILE_UPLOAD',
              label: 'Certificate of Incorporation',
              required: true,
              file: file(['PDF'], { expiration_policy: 'NONE' }),
            },
            {
              id: 'tax_clearance',
              type: 'FILE_UPLOAD',
              label: 'Tax Clearance Certificate',
              required: true,
              file: file(['PDF'], { expiration_policy: 'FROM_UPLOAD_DATE', expiration_days: 365 }),
            },
            {
              id: 'liability_insurance',
              type: 'FILE_UPLOAD',
              label: 'Public Liability Insurance',
              required: true,
              file: file(['PDF', 'IMAGE'], { expiration_policy: 'MANUAL' }),
            },
          ],
        },
      ],
    },
  },
  {
    name: 'Employee Onboarding Checklist',
    description: 'Contracts, ID and bank details for new hires.',
    instructions: 'Complete every section before your first day.',
    definition: {
      sections: [
        {
          id: 'employee',
          title: 'Employee',
          fields: [
            { id: 'start_date', type: 'DATE', label: 'Start date', required: true },
            {
              id: 'contract_type',
              type: 'DROPDOWN',
              label: 'Contract type',
              required: true,
              options: ['Full-time', 'Part-time', 'Contractor'],
            },
            { id: 'iban', type: 'SHORT_TEXT', label: 'Bank account (IBAN)', required: true },
          ],
        },
        {
          id: 'files',
          title: 'Documents',
          fields: [
            {
              id: 'signed_contract',
              type: 'FILE_UPLOAD',
              label: 'Signed employment contract',
              required: true,
              file: file(['PDF', 'WORD'], { expiration_policy: 'NONE' }),
            },
            {
              id: 'id_document',
              type: 'FILE_UPLOAD',
              label: 'ID document',
              required: true,
              file: file(['PDF', 'IMAGE'], { expiration_policy: 'MANUAL' }),
            },
          ],
        },
      ],
    },
  },
];

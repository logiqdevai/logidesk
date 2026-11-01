import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ExpirationPolicy, FileFormat, FormFieldType, ReminderIntervalUnit } from 'generated/prisma';

/** Field types that hold a value (and so can be answered / required). */
export const VALUE_FIELD_TYPES: FormFieldType[] = [
  FormFieldType.SHORT_TEXT,
  FormFieldType.LONG_TEXT,
  FormFieldType.NUMBER,
  FormFieldType.EMAIL,
  FormFieldType.PHONE,
  FormFieldType.DATE,
  FormFieldType.DROPDOWN,
  FormFieldType.MULTIPLE_CHOICE,
  FormFieldType.CHECKBOXES,
  FormFieldType.YES_NO,
];
export const CHOICE_FIELD_TYPES: FormFieldType[] = [
  FormFieldType.DROPDOWN,
  FormFieldType.MULTIPLE_CHOICE,
  FormFieldType.CHECKBOXES,
];

/** Accepts "09:00", "09:00:00" (browser time inputs) and treats an empty value as unset. */
const hhmm = z.preprocess(
  (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim().slice(0, 5)) : v),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm')
    .nullish(),
);

export const ScheduleInputSchema = z
  .object({
    enabled: z.boolean().nullish(),
    start_days_before: z.number().int().min(0).max(365).nullish(),
    interval_count: z.number().int().min(1).max(720).nullish(),
    interval_unit: z.enum(ReminderIntervalUnit).nullish(),
    interval_weekday: z.number().int().min(1).max(7).nullish(),
    send_time: hhmm,
    overdue_enabled: z.boolean().nullish(),
    overdue_interval_count: z.number().int().min(1).max(720).nullish(),
    overdue_interval_unit: z.enum(ReminderIntervalUnit).nullish(),
    overdue_interval_weekday: z.number().int().min(1).max(7).nullish(),
    overdue_max_count: z.number().int().min(0).max(100).nullish(),
  })
  .strip()
  .refine((s) => s.interval_unit === ReminderIntervalUnit.HOURS || (s.interval_count ?? 1) <= 52, { path: ["interval_count"], message: "Too large" })
  .refine((s) => s.overdue_interval_unit === ReminderIntervalUnit.HOURS || (s.overdue_interval_count ?? 1) <= 52, { path: ["overdue_interval_count"], message: "Too large" });
export type ScheduleInput = z.infer<typeof ScheduleInputSchema>;

const FileConfigSchema = z.object({
  accepted_formats: z.array(z.enum(FileFormat)).min(1).default([FileFormat.PDF, FileFormat.IMAGE]),
  max_file_size_mb: z.number().int().min(1).max(100).default(10),
  max_files: z.number().int().min(1).max(20).default(1),
  allow_multiple_submissions: z.boolean().default(false),
  requires_approval: z.boolean().default(true),
  /** Null = use the form default. */
  expiration_policy: z.enum(ExpirationPolicy).nullish(),
  expiration_days: z.number().int().min(1).max(3650).nullish(),
  fixed_expiration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  instructions: z.string().max(2000).nullish(),
  reminder: ScheduleInputSchema.nullish(),
});

const VisibilitySchema = z.object({
  field_id: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'contains', 'answered', 'not_answered']),
  value: z.any().optional(),
});

export const FieldSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  type: z.enum(FormFieldType),
  label: z.string().trim().max(300).default(''),
  help: z.string().max(2000).nullish(),
  placeholder: z.string().max(200).nullish(),
  required: z.boolean().default(false),
  default_value: z.any().optional(),
  options: z.array(z.string().trim().min(1).max(200)).max(100).nullish(),
  validation: z
    .object({
      min: z.number().nullish(),
      max: z.number().nullish(),
      min_length: z.number().int().min(0).nullish(),
      max_length: z.number().int().min(1).nullish(),
      pattern: z.string().max(300).nullish(),
      pattern_message: z.string().max(200).nullish(),
    })
    .nullish(),
  visibility: VisibilitySchema.nullish(),
  file: FileConfigSchema.nullish(),
});

export const SectionSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().trim().max(200).default(''),
  description: z.string().max(2000).nullish(),
  fields: z.array(FieldSchema).max(200),
});

export const DefinitionSchema = z.object({ sections: z.array(SectionSchema).max(50) });

export type FormFieldDefinition = z.infer<typeof FieldSchema>;
export type FormSectionDefinition = z.infer<typeof SectionSchema>;
export type FormDefinition = z.infer<typeof DefinitionSchema>;

/** Validates the structured JSON schema of a form (backend is the source of truth). */
export function parseDefinition(input: unknown): FormDefinition {
  const parsed = DefinitionSchema.safeParse(input ?? { sections: [] });
  if (!parsed.success) {
    throw new BadRequestException({
      message: 'The form definition is invalid',
      errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  const definition = parsed.data;
  const ids = new Set<string>();
  const errors: Array<{ field: string; message: string }> = [];
  const sectionIds = new Set<string>();
  for (const section of definition.sections) {
    if (sectionIds.has(section.id)) errors.push({ field: section.id, message: 'Duplicate section id' });
    sectionIds.add(section.id);
    for (const field of section.fields) {
      if (ids.has(field.id)) errors.push({ field: field.id, message: 'Duplicate field id' });
      ids.add(field.id);
      if (VALUE_FIELD_TYPES.includes(field.type) || field.type === FormFieldType.FILE_UPLOAD) {
        if (!field.label) errors.push({ field: field.id, message: 'Every question needs a label' });
      }
      if (CHOICE_FIELD_TYPES.includes(field.type) && !(field.options?.length > 0)) {
        errors.push({ field: field.id, message: `"${field.label || 'Choice field'}" needs at least one option` });
      }
      if (field.type === FormFieldType.FILE_UPLOAD) {
        field.file = FileConfigSchema.parse(field.file ?? {});
        if (field.file.expiration_policy === ExpirationPolicy.FROM_UPLOAD_DATE && !field.file.expiration_days) {
          errors.push({ field: field.id, message: `"${field.label}" needs the number of days until expiration` });
        }
        if (field.file.expiration_policy === ExpirationPolicy.FIXED_DATE && !field.file.fixed_expiration_date) {
          errors.push({ field: field.id, message: `"${field.label}" needs a fixed expiration date` });
        }
      } else {
        field.file = null;
      }
      if (!CHOICE_FIELD_TYPES.includes(field.type)) field.options = null;
    }
  }
  for (const field of allFields(definition)) {
    if (field.visibility) {
      if (field.visibility.field_id === field.id || !ids.has(field.visibility.field_id)) {
        errors.push({ field: field.id, message: `"${field.label}" has a visibility rule pointing to a missing question` });
      }
    }
  }
  if (errors.length) throw new BadRequestException({ message: errors[0].message, errors });
  return definition;
}

export function allFields(definition: FormDefinition): FormFieldDefinition[] {
  return definition.sections.flatMap((s) => s.fields);
}

export function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Conditional visibility: show/hide a field based on another field's answer. */
export function isFieldVisible(
  field: FormFieldDefinition,
  answers: Record<string, unknown>,
  definition?: FormDefinition,
  depth = 0,
): boolean {
  const rule = field.visibility;
  if (!rule) return true;
  if (definition && depth < 10) {
    const parent = allFields(definition).find((f) => f.id === rule.field_id);
    if (parent && !isFieldVisible(parent, answers, definition, depth + 1)) return false;
  }
  const value = answers[rule.field_id];
  const eq = (a: unknown, b: unknown) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
  switch (rule.operator) {
    case 'answered':
      return !isEmptyValue(value);
    case 'not_answered':
      return isEmptyValue(value);
    case 'equals':
      return Array.isArray(value) ? value.some((v) => eq(v, rule.value)) : eq(value, rule.value);
    case 'not_equals':
      return Array.isArray(value) ? !value.some((v) => eq(v, rule.value)) : !eq(value, rule.value);
    case 'contains':
      return Array.isArray(value)
        ? value.some((v) => eq(v, rule.value))
        : String(value ?? '').toLowerCase().includes(String(rule.value ?? '').toLowerCase());
    default:
      return true;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s.-]{5,25}$/;

/**
 * Validates and normalizes answers against a pinned form version. Hidden fields are dropped.
 * With `requireComplete`, required visible fields must be answered (submit); drafts skip that.
 */
export function validateAnswers(
  definition: FormDefinition,
  input: Record<string, unknown>,
  options: { requireComplete: boolean },
): { values: Record<string, unknown>; errors: Record<string, string> } {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const merged = { ...input };

  for (const field of allFields(definition)) {
    if (!VALUE_FIELD_TYPES.includes(field.type)) continue;
    if (!(field.id in merged)) continue;
    let value = merged[field.id];
    if (isEmptyValue(value)) {
      values[field.id] = null;
      continue;
    }
    const v = field.validation ?? {};
    switch (field.type) {
      case FormFieldType.SHORT_TEXT:
      case FormFieldType.LONG_TEXT: {
        value = String(value).slice(0, field.type === FormFieldType.SHORT_TEXT ? 1000 : 20000);
        const s = value as string;
        if (v.min_length && s.length < v.min_length) errors[field.id] = `Enter at least ${v.min_length} characters`;
        if (v.max_length && s.length > v.max_length) errors[field.id] = `Enter at most ${v.max_length} characters`;
        if (v.pattern) {
          try {
            if (!new RegExp(v.pattern).test(s)) errors[field.id] = v.pattern_message || 'The format is not valid';
          } catch {
            // invalid pattern configured: ignore
          }
        }
        break;
      }
      case FormFieldType.NUMBER: {
        const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
        if (!Number.isFinite(n)) errors[field.id] = 'Enter a number';
        else {
          if (v.min !== null && v.min !== undefined && n < v.min) errors[field.id] = `Must be at least ${v.min}`;
          if (v.max !== null && v.max !== undefined && n > v.max) errors[field.id] = `Must be at most ${v.max}`;
          value = n;
        }
        break;
      }
      case FormFieldType.EMAIL:
        value = String(value).trim();
        if (!EMAIL_RE.test(value as string)) errors[field.id] = 'Enter a valid email address';
        break;
      case FormFieldType.PHONE:
        value = String(value).trim();
        if (!PHONE_RE.test(value as string)) errors[field.id] = 'Enter a valid phone number';
        break;
      case FormFieldType.DATE:
        value = String(value).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value as string) || isNaN(Date.parse(value as string))) {
          errors[field.id] = 'Enter a valid date';
        }
        break;
      case FormFieldType.DROPDOWN:
      case FormFieldType.MULTIPLE_CHOICE:
        value = String(value);
        if (!(field.options ?? []).includes(value as string)) errors[field.id] = 'Choose one of the options';
        break;
      case FormFieldType.CHECKBOXES: {
        const arr = (Array.isArray(value) ? value : [value]).map(String);
        if (arr.some((x) => !(field.options ?? []).includes(x))) errors[field.id] = 'Choose from the options';
        value = arr;
        break;
      }
      case FormFieldType.YES_NO:
        if (typeof value === 'string') value = value === 'true' || value === 'yes';
        value = Boolean(value);
        break;
    }
    values[field.id] = value;
  }

  // Drop answers of hidden fields and check required ones.
  const effective = { ...merged, ...values };
  for (const field of allFields(definition)) {
    if (!VALUE_FIELD_TYPES.includes(field.type)) continue;
    const visible = isFieldVisible(field, effective, definition);
    if (!visible) {
      if (field.id in values) values[field.id] = null;
      delete errors[field.id];
      continue;
    }
    if (options.requireComplete && field.required && isEmptyValue(effective[field.id])) {
      errors[field.id] = 'This question is required';
    }
  }
  return { values, errors };
}

/** Counts for the Forms list: answerable fields and document requirements. */
export function countDefinition(definition: FormDefinition) {
  const fields = allFields(definition);
  return {
    field_count: fields.filter((f) => VALUE_FIELD_TYPES.includes(f.type) || f.type === FormFieldType.FILE_UPLOAD).length,
    document_count: fields.filter((f) => f.type === FormFieldType.FILE_UPLOAD).length,
  };
}

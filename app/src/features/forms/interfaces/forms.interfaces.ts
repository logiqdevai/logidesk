import type { FileFormat } from "@/features/documents/interfaces/documents.interfaces";

export const FieldTypes = {
  SHORT_TEXT: "SHORT_TEXT",
  LONG_TEXT: "LONG_TEXT",
  NUMBER: "NUMBER",
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  DATE: "DATE",
  DROPDOWN: "DROPDOWN",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  CHECKBOXES: "CHECKBOXES",
  FILE_UPLOAD: "FILE_UPLOAD",
  YES_NO: "YES_NO",
  HEADING: "HEADING",
  DESCRIPTION: "DESCRIPTION",
  DIVIDER: "DIVIDER",
} as const;
export type FieldType = (typeof FieldTypes)[keyof typeof FieldTypes];

export const VALUE_FIELD_TYPES: FieldType[] = ["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "PHONE", "DATE", "DROPDOWN", "MULTIPLE_CHOICE", "CHECKBOXES", "YES_NO"];
export const CHOICE_FIELD_TYPES: FieldType[] = ["DROPDOWN", "MULTIPLE_CHOICE", "CHECKBOXES"];

export const ExpirationPolicies = { NONE: "NONE", MANUAL: "MANUAL", FROM_UPLOAD_DATE: "FROM_UPLOAD_DATE", FIXED_DATE: "FIXED_DATE" } as const;
export type ExpirationPolicy = (typeof ExpirationPolicies)[keyof typeof ExpirationPolicies];

export const IntervalUnits = { DAYS: "DAYS", WEEKS: "WEEKS", HOURS: "HOURS" } as const;
export type IntervalUnit = (typeof IntervalUnits)[keyof typeof IntervalUnits];

export interface ReminderScheduleInput {
  enabled?: boolean | null;
  start_days_before?: number | null;
  interval_count?: number | null;
  interval_unit?: IntervalUnit | null;
  /** ISO weekday 1 (Monday) – 7 (Sunday), used when the unit is WEEKS. */
  interval_weekday?: number | null;
  send_time?: string | null;
  overdue_enabled?: boolean | null;
  overdue_interval_count?: number | null;
  overdue_interval_unit?: IntervalUnit | null;
  overdue_interval_weekday?: number | null;
  overdue_max_count?: number | null;
}

export interface FileFieldConfig {
  accepted_formats: FileFormat[];
  max_file_size_mb: number;
  max_files: number;
  allow_multiple_submissions: boolean;
  requires_approval: boolean;
  expiration_policy?: ExpirationPolicy | null;
  expiration_days?: number | null;
  fixed_expiration_date?: string | null;
  instructions?: string | null;
  reminder?: ReminderScheduleInput | null;
}

export type VisibilityOperator = "equals" | "not_equals" | "contains" | "answered" | "not_answered";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  help?: string | null;
  placeholder?: string | null;
  required: boolean;
  default_value?: unknown;
  options?: string[] | null;
  validation?: {
    min?: number | null;
    max?: number | null;
    min_length?: number | null;
    max_length?: number | null;
    pattern?: string | null;
    pattern_message?: string | null;
  } | null;
  visibility?: { field_id: string; operator: VisibilityOperator; value?: unknown } | null;
  file?: FileFieldConfig | null;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string | null;
  fields: FormField[];
}

export interface FormDefinition {
  sections: FormSection[];
}

export const FormStatuses = { DRAFT: "DRAFT", PUBLISHED: "PUBLISHED", ARCHIVED: "ARCHIVED" } as const;
export type FormStatus = (typeof FormStatuses)[keyof typeof FormStatuses];

export interface FormListItem {
  id: string;
  name: string;
  description: string | null;
  status: FormStatus;
  is_template: boolean;
  is_public: boolean;
  field_count: number;
  document_count: number;
  assignment_count: number;
  updated_at: string;
}

export interface FormDetail {
  id: string;
  name: string;
  description: string | null;
  status: FormStatus;
  is_template: boolean;
  is_public: boolean;
  assignment_count: number;
  updated_at: string;
  instructions: string | null;
  definition: FormDefinition;
  default_expiration_policy: ExpirationPolicy;
  default_expiration_days: number | null;
  default_fixed_expiration_date: string | null;
  default_reminder: ReminderScheduleInput | null;
  field_count: number;
  document_count: number;
}

export interface SaveFormDto {
  name?: string;
  description?: string | null;
  instructions?: string | null;
  definition?: FormDefinition;
  is_template?: boolean;
  is_public?: boolean;
  default_expiration_policy?: ExpirationPolicy;
  default_expiration_days?: number | null;
  default_fixed_expiration_date?: string | null;
  default_reminder?: ReminderScheduleInput | null;
  publish?: boolean;
}

export interface FormQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  template?: string;
}

export interface SubmissionRow {
  assignment_id: string;
  client: { id: string; name: string; company: string | null; email: string | null };
  assignees: Array<{ member_id: string; name: string }>;
  assigned_at: string;
  last_submission_at: string | null;
  deadline: string | null;
  requirements_completed: number;
  requirements_total: number;
  progress_percent: number;
  status: string;
}

export interface SubmissionsResponse {
  form: { id: string; name: string; status: FormStatus };
  summary: { assigned: number; complete: number; under_review: number; overdue: number };
  data: SubmissionRow[];
}

export interface SubmissionsQuery {
  search?: string;
  client_id?: string;
  status?: string;
  employee_id?: string;
  submitted?: string;
}

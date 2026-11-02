import type { DocumentFile, FileFormat, RequirementStatus } from "@/features/documents/interfaces/documents.interfaces";
import type { ExpirationPolicy, FormDefinition, ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";
import type { ActivityItem } from "@/features/dashboard/interfaces/dashboard.interfaces";

export const AssignmentStatuses = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  UNDER_REVIEW: "UNDER_REVIEW",
  COMPLETE: "COMPLETE",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;
export type AssignmentStatus = (typeof AssignmentStatuses)[keyof typeof AssignmentStatuses];

export interface AssignmentListItem {
  id: string;
  form_id: string;
  form_name: string;
  assigned_at: string;
  assigned_by: string | null;
  deadline: string | null;
  status: AssignmentStatus;
  progress_percent: number;
  requirements_total: number;
  requirements_completed: number;
  requirements_missing: number;
  requirements_expired: number;
  last_submission_at: string | null;
  cancelled_at: string | null;
}

export interface EffectiveSchedule extends Required<Omit<ReminderScheduleInput, "overdue_max_count">> {
  overdue_max_count: number | null;
  summary: string;
}

export interface AssignmentRequirement {
  id: string;
  field_key: string;
  name: string;
  description: string | null;
  instructions: string | null;
  is_required: boolean;
  accepted_formats: FileFormat[];
  max_file_size_mb: number;
  max_files: number;
  allow_multiple_submissions: boolean;
  requires_approval: boolean;
  expiration_policy: ExpirationPolicy;
  status: RequirementStatus;
  deadline: string | null;
  effective_deadline: string | null;
  not_required_reason: string | null;
  current_documents: DocumentFile[];
  history: DocumentFile[];
  last_reminder_sent_at: string | null;
  reminders_sent_count: number;
  reminder?: EffectiveSchedule;
  reminder_override?: ReminderScheduleInput | null;
}

export interface AssignmentDetail {
  id: string;
  status: AssignmentStatus;
  assigned_at: string;
  assigned_by: string | null;
  deadline: string | null;
  message: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  last_submission_at: string | null;
  progress_percent: number;
  requirements_total: number;
  requirements_completed: number;
  requirements_missing: number;
  requirements_expired: number;
  client: { id: string; name: string; company: string | null; email?: string | null };
  form: { id: string; name: string };
  title: string;
  description: string | null;
  instructions: string | null;
  definition: FormDefinition;
  response: { status: "DRAFT" | "SUBMITTED"; submitted_at: string | null; last_saved_at: string | null; locked_for_client?: boolean; answers: Record<string, unknown> };
  requirements: AssignmentRequirement[];
  reminder_override?: ReminderScheduleInput | null;
  recent_changes?: ActivityItem[];
}

export const RecurrenceFrequencies = {
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  SEMI_ANNUAL: "SEMI_ANNUAL",
  YEARLY: "YEARLY",
} as const;
export type RecurrenceFrequency = (typeof RecurrenceFrequencies)[keyof typeof RecurrenceFrequencies];
export type RecurrenceStatus = "ACTIVE" | "PAUSED" | "ENDED";
export type RecurrenceEndMode = "NEVER" | "AFTER_COUNT" | "ON_DATE";
export type RecurrenceDeadlineMode = "NONE" | "AFTER_ASSIGNMENT" | "END_OF_PERIOD" | "DAY_IN_PERIOD" | "BEFORE_NEXT";
export type RecurrenceOverlapPolicy = "CREATE_ANYWAY" | "SKIP";

/** Schedule of a recurring assignment (times are in the organization time zone). */
export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  interval_count?: number;
  /** Weekly: 1 = Monday … 7 = Sunday. */
  weekday?: number;
  day_of_month?: number;
  last_day_of_month?: boolean;
  /** Quarterly 1–3, semi-annual 1–6, yearly 1–12. */
  month_of_year?: number;
  run_time: string;
  start_now?: boolean;
  starts_on?: string;
  end_mode?: RecurrenceEndMode;
  end_count?: number;
  end_date?: string;
  deadline_mode?: RecurrenceDeadlineMode;
  deadline_offset_days?: number;
  deadline_time?: string;
  deadline_day?: number;
  deadline_last_day?: boolean;
  overlap_policy?: RecurrenceOverlapPolicy;
}

export interface RecurrenceOccurrence {
  run_at: string | null;
  deadline_at: string | null;
}

export interface RecurrenceItem {
  id: string;
  client_id: string;
  client: { id: string; name: string; company_name: string | null } | null;
  form_ids: string[];
  forms: Array<{ id: string; name: string }>;
  status: RecurrenceStatus;
  frequency: RecurrenceFrequency;
  interval_count: number;
  weekday: number | null;
  day_of_month: number | null;
  last_day_of_month: boolean;
  month_of_year: number | null;
  run_time: string;
  time_zone: string;
  starts_on: string | null;
  end_mode: RecurrenceEndMode;
  end_count: number | null;
  end_date: string | null;
  deadline_mode: RecurrenceDeadlineMode;
  deadline_offset_days: number | null;
  deadline_time: string | null;
  deadline_day: number | null;
  deadline_last_day: boolean;
  message: string | null;
  notify_client: boolean;
  overlap_policy: RecurrenceOverlapPolicy;
  next_run_at: string | null;
  last_run_at: string | null;
  occurrences_created: number;
  upcoming: RecurrenceOccurrence[];
  created_at: string | null;
}

export interface RecurrenceQuery {
  client_id?: string;
  form_id?: string;
  status?: RecurrenceStatus;
  page?: number;
  limit?: number;
}

export interface UpdateRecurrenceDto extends Partial<RecurrenceInput> {
  form_ids?: string[];
  message?: string | null;
  notify_client?: boolean;
}

export interface CreateAssignmentDto {
  client_ids: string[];
  form_ids: string[];
  deadline?: string | null;
  message?: string;
  reminder?: ReminderScheduleInput | null;
  notify_client?: boolean;
  /** Repeat on a schedule; when set the deadline comes from the schedule rule. */
  recurrence?: RecurrenceInput;
}

export interface UpdateRequirementDto {
  deadline?: string | null;
  not_required?: boolean;
  not_required_reason?: string;
  reminder?: ReminderScheduleInput | null;
}

export interface SaveAnswersDto {
  answers: Record<string, unknown>;
  submit?: boolean;
}

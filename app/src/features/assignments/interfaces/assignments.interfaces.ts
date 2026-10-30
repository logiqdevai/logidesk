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
  response: { status: "DRAFT" | "SUBMITTED"; submitted_at: string | null; last_saved_at: string | null; answers: Record<string, unknown> };
  requirements: AssignmentRequirement[];
  reminder_override?: ReminderScheduleInput | null;
  recent_changes?: ActivityItem[];
}

export interface CreateAssignmentDto {
  client_id: string;
  form_ids: string[];
  deadline?: string | null;
  message?: string;
  reminder?: ReminderScheduleInput | null;
  notify_client?: boolean;
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

import type { IntervalUnit } from "@/features/forms/interfaces/forms.interfaces";
import type { RequirementStatus } from "@/features/documents/interfaces/documents.interfaces";

export const NotificationStatuses = { PENDING: "PENDING", SENT: "SENT", DELIVERED: "DELIVERED", FAILED: "FAILED", CANCELLED: "CANCELLED" } as const;
export type NotificationStatus = (typeof NotificationStatuses)[keyof typeof NotificationStatuses];

export const NotificationTypes = {
  FORM_ASSIGNED: "FORM_ASSIGNED",
  MISSING_DOCUMENTS: "MISSING_DOCUMENTS",
  EXPIRING_DOCUMENTS: "EXPIRING_DOCUMENTS",
  EXPIRED_DOCUMENTS: "EXPIRED_DOCUMENTS",
  DOCUMENT_REJECTED: "DOCUMENT_REJECTED",
  DOCUMENT_APPROVED: "DOCUMENT_APPROVED",
  CLIENT_INVITATION: "CLIENT_INVITATION",
  TEAM_INVITATION: "TEAM_INVITATION",
  EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
  PASSWORD_RESET: "PASSWORD_RESET",
  MANUAL_REMINDER: "MANUAL_REMINDER",
  EMPLOYEE_ALERT: "EMPLOYEE_ALERT",
  CUSTOM: "CUSTOM",
} as const;
export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export interface NotificationItem {
  id: string;
  type: NotificationType;
  channel: "EMAIL" | "SMS";
  trigger: "MANUAL" | "AUTOMATIC";
  status: NotificationStatus;
  recipient_address: string;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  client: { id: string; name: string; company: string | null } | null;
  assignment: { id: string; form_name: string } | null;
  sent_by: string | null;
  provider: string | null;
  provider_message_id: string | null;
  provider_response: unknown;
  failure_reason: string | null;
  attempt_count: number;
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

export interface NotificationDetail extends NotificationItem {
  jobs: Array<{
    id: string;
    job_id: string;
    attempt: number;
    max_attempts: number;
    status: string;
    trigger: string;
    queued_at: string;
    started_at: string | null;
    finished_at: string | null;
    wait_ms: number | null;
    duration_ms: number | null;
    worker_id: string | null;
    error_message: string | null;
  }>;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  trigger?: string;
  client_id?: string;
  search?: string;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: "EMAIL" | "SMS";
  name: string;
  subject: string | null;
  body: string;
  is_default: boolean;
  is_system: boolean;
  updated_at: string;
}

export interface SaveTemplateDto {
  type: NotificationType;
  name: string;
  subject?: string;
  body: string;
  is_default?: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  offsets_days: number[];
  repeat_enabled: boolean;
  repeat_interval_count: number | null;
  repeat_interval_unit: IntervalUnit | null;
  max_sends: number | null;
}

export interface Schedule {
  enabled: boolean;
  start_days_before: number;
  interval_count: number;
  interval_unit: IntervalUnit;
  send_time: string;
  overdue_enabled: boolean;
  overdue_interval_count: number;
  overdue_interval_unit: IntervalUnit;
  overdue_max_count: number | null;
  summary?: string;
}

export interface NotificationSettings {
  id: string;
  enabled_channels: Array<"EMAIL" | "SMS">;
  email_provider: "RESEND" | "SMTP";
  sender_name: string | null;
  sender_email: string | null;
  auto_reminders_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  retry_max_attempts: number;
  retry_interval_minutes: number;
  time_zone: string;
  default_reminder_schedule: Schedule;
  automation_rules: AutomationRule[];
  providers: Array<{ name: string; channel: string; configured: boolean }>;
}

export type UpdateNotificationSettingsDto = Partial<Omit<NotificationSettings, "id" | "default_reminder_schedule" | "automation_rules" | "providers">> & {
  default_reminder_schedule?: Omit<Schedule, "summary">;
  automation_rules?: Array<Partial<AutomationRule> & { id: string }>;
};

export interface ReminderPreview {
  recipient: { name: string; email: string | null };
  channel: "EMAIL";
  items: Array<{
    assignment_requirement_id: string;
    assignment_id: string;
    name: string;
    form_name: string;
    status: RequirementStatus;
    deadline: string | null;
    expiration_date: string | null;
  }>;
  subject: string;
  body: string;
}

export interface SendReminderDto {
  client_id: string;
  assignment_id?: string;
  subject?: string;
  body?: string;
}

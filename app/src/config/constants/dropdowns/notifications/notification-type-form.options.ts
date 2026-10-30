import type { NotificationType } from "@/features/notifications/interfaces/notifications.interfaces";

export const NotificationTypeFormOptions: { id: NotificationType; label: string }[] = [
  { id: "FORM_ASSIGNED", label: "New form assignment" },
  { id: "MISSING_DOCUMENTS", label: "Missing documents" },
  { id: "EXPIRING_DOCUMENTS", label: "Expiring documents" },
  { id: "EXPIRED_DOCUMENTS", label: "Expired documents" },
  { id: "DOCUMENT_REJECTED", label: "Document rejection" },
  { id: "DOCUMENT_APPROVED", label: "Document approval" },
  { id: "CLIENT_INVITATION", label: "Client invitation" },
  { id: "TEAM_INVITATION", label: "Team invitation" },
  { id: "MANUAL_REMINDER", label: "Manual reminder" },
  { id: "EMPLOYEE_ALERT", label: "Employee alert" },
  { id: "EMAIL_VERIFICATION", label: "Email verification" },
  { id: "PASSWORD_RESET", label: "Password reset" },
  { id: "CUSTOM", label: "Custom" },
];

export function getNotificationTypeLabel(id?: NotificationType | string | null): string {
  return NotificationTypeFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

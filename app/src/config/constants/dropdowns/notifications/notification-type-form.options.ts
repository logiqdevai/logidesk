import i18n from "@/i18n";
import type { NotificationType } from "@/features/notifications/interfaces/notifications.interfaces";

const type = (id: NotificationType): { id: NotificationType; label: string } => ({
  id,
  // Resolved lazily so the label follows the active language.
  get label() {
    return i18n.t(`types.${id}`, { ns: "notifications" });
  },
});

export const NotificationTypeFormOptions: { id: NotificationType; label: string }[] = [
  type("FORM_ASSIGNED"),
  type("MISSING_DOCUMENTS"),
  type("EXPIRING_DOCUMENTS"),
  type("EXPIRED_DOCUMENTS"),
  type("DOCUMENT_REJECTED"),
  type("DOCUMENT_APPROVED"),
  type("CLIENT_INVITATION"),
  type("TEAM_INVITATION"),
  type("MANUAL_REMINDER"),
  type("EMPLOYEE_ALERT"),
  type("EMAIL_VERIFICATION"),
  type("PASSWORD_RESET"),
  type("CUSTOM"),
];

export function getNotificationTypeLabel(id?: NotificationType | string | null): string {
  return NotificationTypeFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

import i18n from "@/i18n";
import type { NotificationStatus } from "@/features/notifications/interfaces/notifications.interfaces";

const status = (id: NotificationStatus): { id: NotificationStatus; label: string } => ({
  id,
  // Resolved lazily so the label follows the active language.
  get label() {
    return i18n.t(`statuses.${id}`, { ns: "notifications" });
  },
});

export const NotificationStatusFormOptions: { id: NotificationStatus; label: string }[] = [
  status("PENDING"),
  status("SENT"),
  status("DELIVERED"),
  status("FAILED"),
  status("CANCELLED"),
];

export function getNotificationStatusLabel(id?: NotificationStatus | string | null): string {
  return NotificationStatusFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

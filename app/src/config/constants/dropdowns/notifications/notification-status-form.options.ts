import type { NotificationStatus } from "@/features/notifications/interfaces/notifications.interfaces";

export const NotificationStatusFormOptions: { id: NotificationStatus; label: string }[] = [
  { id: "PENDING", label: "Pending" },
  { id: "SENT", label: "Sent" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "FAILED", label: "Failed" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function getNotificationStatusLabel(id?: NotificationStatus | string | null): string {
  return NotificationStatusFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

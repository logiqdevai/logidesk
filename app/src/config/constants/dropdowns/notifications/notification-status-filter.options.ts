import type { NotificationStatus } from "@/features/notifications/interfaces/notifications.interfaces";
import { NotificationStatusFormOptions } from "./notification-status-form.options";

export const NotificationStatusFilterOptions: { id: NotificationStatus | "all"; label: string }[] = [
  { id: "all", label: "All statuses" },
  ...NotificationStatusFormOptions,
];

import type { NotificationType } from "@/features/notifications/interfaces/notifications.interfaces";
import { NotificationTypeFormOptions } from "./notification-type-form.options";

export const NotificationTypeFilterOptions: { id: NotificationType | "all"; label: string }[] = [
  { id: "all", label: "All types" },
  ...NotificationTypeFormOptions,
];

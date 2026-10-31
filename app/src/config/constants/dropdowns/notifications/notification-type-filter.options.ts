import i18n from "@/i18n";
import type { NotificationType } from "@/features/notifications/interfaces/notifications.interfaces";
import { NotificationTypeFormOptions } from "./notification-type-form.options";

export const NotificationTypeFilterOptions: { id: NotificationType | "all"; label: string }[] = [
  {
    id: "all",
    get label() {
      return i18n.t("filters.allTypes", { ns: "notifications" });
    },
  },
  ...NotificationTypeFormOptions,
];

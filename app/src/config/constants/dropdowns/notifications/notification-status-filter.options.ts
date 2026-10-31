import i18n from "@/i18n";
import type { NotificationStatus } from "@/features/notifications/interfaces/notifications.interfaces";
import { NotificationStatusFormOptions } from "./notification-status-form.options";

export const NotificationStatusFilterOptions: { id: NotificationStatus | "all"; label: string }[] = [
  {
    id: "all",
    get label() {
      return i18n.t("filters.allStatuses", { ns: "notifications" });
    },
  },
  ...NotificationStatusFormOptions,
];

import type { InboxStatus } from "@/features/inbox/interfaces/inbox.interfaces";
import { InboxStatusFormOptions } from "./inbox-status-form.options";

export const InboxStatusFilterOptions: { id: InboxStatus | "all"; label: string }[] = [
  { id: "all", label: "All statuses" },
  ...InboxStatusFormOptions,
];

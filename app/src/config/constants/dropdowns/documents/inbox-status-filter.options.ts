import type { InboxStatus } from "@/features/inbox/interfaces/inbox.interfaces";
import { lazyOption } from "./lazy-option";
import { InboxStatusFormOptions } from "./inbox-status-form.options";

export const InboxStatusFilterOptions: { id: InboxStatus | "all"; label: string }[] = [
  lazyOption<InboxStatus | "all">("all", "documents:filters.allStatuses"),
  ...InboxStatusFormOptions.map((o) => lazyOption(o.id, `inbox:status.${o.id}`)),
];

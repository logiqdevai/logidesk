import type { InboxStatus } from "@/features/inbox/interfaces/inbox.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "inbox:status";

export const InboxStatusFormOptions: { id: InboxStatus; label: string }[] = lazyOptions(["RECEIVED", "PROCESSING", "MATCHED", "NEEDS_REVIEW", "UNMATCHED", "FAILED", "DUPLICATE", "RESOLVED"] as const, PREFIX);

export function getInboxStatusLabel(id?: InboxStatus | string | null): string {
  return optionLabel(PREFIX, id);
}

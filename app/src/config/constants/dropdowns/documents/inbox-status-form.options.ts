import type { InboxStatus } from "@/features/inbox/interfaces/inbox.interfaces";

export const InboxStatusFormOptions: { id: InboxStatus; label: string }[] = [
  { id: "RECEIVED", label: "Received" },
  { id: "PROCESSING", label: "Processing" },
  { id: "MATCHED", label: "Matched" },
  { id: "NEEDS_REVIEW", label: "Needs Review" },
  { id: "UNMATCHED", label: "Unmatched" },
  { id: "FAILED", label: "Failed" },
  { id: "DUPLICATE", label: "Duplicate" },
  { id: "RESOLVED", label: "Resolved" },
];

export function getInboxStatusLabel(id?: InboxStatus | string | null): string {
  return InboxStatusFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

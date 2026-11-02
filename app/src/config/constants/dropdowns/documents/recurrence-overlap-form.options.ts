import type { RecurrenceOverlapPolicy } from "@/features/assignments/interfaces/assignments.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "recurrence:overlap";

export const RecurrenceOverlapFormOptions: { id: RecurrenceOverlapPolicy; label: string }[] = lazyOptions(["CREATE_ANYWAY", "SKIP"] as const, PREFIX);

export function getRecurrenceOverlapLabel(id?: RecurrenceOverlapPolicy | string | null): string {
  return optionLabel(PREFIX, id);
}

import type { RecurrenceStatus } from "@/features/assignments/interfaces/assignments.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "recurrence:status";

export const RecurrenceStatusFormOptions: { id: RecurrenceStatus; label: string }[] = lazyOptions(["ACTIVE", "PAUSED", "ENDED"] as const, PREFIX);

export function getRecurrenceStatusLabel(id?: RecurrenceStatus | string | null): string {
  return optionLabel(PREFIX, id);
}

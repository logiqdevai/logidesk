import type { RecurrenceFrequency } from "@/features/assignments/interfaces/assignments.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "recurrence:frequency";

export const RecurrenceFrequencyFormOptions: { id: RecurrenceFrequency; label: string }[] = lazyOptions(["WEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "YEARLY"] as const, PREFIX);

export function getRecurrenceFrequencyLabel(id?: RecurrenceFrequency | string | null): string {
  return optionLabel(PREFIX, id);
}

import type { RecurrenceEndMode } from "@/features/assignments/interfaces/assignments.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "recurrence:endMode";

export const RecurrenceEndModeFormOptions: { id: RecurrenceEndMode; label: string }[] = lazyOptions(["NEVER", "AFTER_COUNT", "ON_DATE"] as const, PREFIX);

export function getRecurrenceEndModeLabel(id?: RecurrenceEndMode | string | null): string {
  return optionLabel(PREFIX, id);
}

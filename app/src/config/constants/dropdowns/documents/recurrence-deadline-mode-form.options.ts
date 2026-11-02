import type { RecurrenceDeadlineMode } from "@/features/assignments/interfaces/assignments.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "recurrence:deadlineMode";

export const RecurrenceDeadlineModeFormOptions: { id: RecurrenceDeadlineMode; label: string }[] = lazyOptions(["NONE", "AFTER_ASSIGNMENT", "END_OF_PERIOD", "DAY_IN_PERIOD", "BEFORE_NEXT"] as const, PREFIX);

export function getRecurrenceDeadlineModeLabel(id?: RecurrenceDeadlineMode | string | null): string {
  return optionLabel(PREFIX, id);
}

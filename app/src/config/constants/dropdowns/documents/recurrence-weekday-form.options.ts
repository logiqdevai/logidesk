import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "documents:schedule.weekdays";

/** ISO weekdays: "1" = Monday … "7" = Sunday. */
export const RecurrenceWeekdayFormOptions = lazyOptions(["1", "2", "3", "4", "5", "6", "7"] as const, PREFIX);

export function getRecurrenceWeekdayLabel(id?: number | string | null): string {
  return optionLabel(PREFIX, id == null ? null : String(id));
}

import type { RecurrenceFrequency } from "@/features/assignments/interfaces/assignments.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "recurrence:months";

export const RecurrenceMonthFormOptions = lazyOptions(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const, PREFIX);

export function getRecurrenceMonthLabel(id?: number | string | null): string {
  return optionLabel(PREFIX, id == null ? null : String(id));
}

/** Cycle length in months for the month-based frequencies. */
export const RECURRENCE_CYCLE_MONTHS: Partial<Record<RecurrenceFrequency, number>> = { QUARTERLY: 3, SEMI_ANNUAL: 6, YEARLY: 12 };

/** Month names of every occurrence in a cycle that starts in `start`, e.g. start 2, every 3 → "February, May, August, November". */
export function getRecurrenceCycleMonthsLabel(frequency: RecurrenceFrequency, start: number): string {
  const step = RECURRENCE_CYCLE_MONTHS[frequency];
  if (!step || step >= 12) return getRecurrenceMonthLabel(start);
  const months: string[] = [];
  for (let m = start; m <= 12; m += step) months.push(getRecurrenceMonthLabel(m));
  for (let m = start - step; m >= 1; m -= step) months.unshift(getRecurrenceMonthLabel(m));
  return months.join(" · ");
}

/** First-month choices: quarterly 1–3, semi-annual 1–6, yearly 1–12 (with the months each choice produces). */
export function getRecurrenceStartMonthOptions(frequency: RecurrenceFrequency): { id: string; label: string }[] {
  const count = frequency === "QUARTERLY" ? 3 : frequency === "SEMI_ANNUAL" ? 6 : 12;
  return Array.from({ length: count }, (_, i) => ({ id: String(i + 1), label: getRecurrenceCycleMonthsLabel(frequency, i + 1) }));
}

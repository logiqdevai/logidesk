import type { IntervalUnit } from "@/features/forms/interfaces/forms.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "forms:intervalUnit";

export const IntervalUnitFormOptions: { id: IntervalUnit; label: string }[] = lazyOptions(["DAYS", "WEEKS"] as const, PREFIX);

export function getIntervalUnitLabel(id?: IntervalUnit | string | null): string {
  return optionLabel(PREFIX, id);
}

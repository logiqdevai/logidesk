import type { IntervalUnit } from "@/features/forms/interfaces/forms.interfaces";

export const IntervalUnitFormOptions: { id: IntervalUnit; label: string }[] = [
  { id: "DAYS", label: "days" },
  { id: "WEEKS", label: "weeks" },
];

export function getIntervalUnitLabel(id?: IntervalUnit | string | null): string {
  return IntervalUnitFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

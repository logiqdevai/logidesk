import type { DeadlinePolicy } from "@/features/forms/interfaces/forms.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "forms:deadlinePolicy";

export const DeadlinePolicyFormOptions: { id: DeadlinePolicy; label: string }[] = lazyOptions(["NONE", "AFTER_ASSIGNMENT", "FIXED_DATE"] as const, PREFIX);

export function getDeadlinePolicyLabel(id?: DeadlinePolicy | string | null): string {
  return optionLabel(PREFIX, id);
}

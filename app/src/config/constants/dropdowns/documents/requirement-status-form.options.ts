import type { RequirementStatus } from "@/features/documents/interfaces/documents.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "documents:status.requirement";

export const RequirementStatusFormOptions: { id: RequirementStatus; label: string }[] = lazyOptions(["MISSING", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED", "NOT_REQUIRED"] as const, PREFIX);

export function getRequirementStatusLabel(id?: RequirementStatus | string | null): string {
  return optionLabel(PREFIX, id);
}

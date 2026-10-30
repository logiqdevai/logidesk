import type { RequirementStatus } from "@/features/documents/interfaces/documents.interfaces";

export const RequirementStatusFormOptions: { id: RequirementStatus; label: string }[] = [
  { id: "MISSING", label: "Missing" },
  { id: "SUBMITTED", label: "Processing" },
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "EXPIRED", label: "Expired" },
  { id: "NOT_REQUIRED", label: "Not Required" },
];

export function getRequirementStatusLabel(id?: RequirementStatus | string | null): string {
  return RequirementStatusFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

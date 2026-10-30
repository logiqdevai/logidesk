import type { RequirementStatus } from "@/features/documents/interfaces/documents.interfaces";
import { RequirementStatusFormOptions } from "./requirement-status-form.options";

export const RequirementStatusFilterOptions: { id: RequirementStatus | "all" | "EXPIRING_SOON"; label: string }[] = [
  { id: "all", label: "All statuses" },
  ...RequirementStatusFormOptions,
  { id: "EXPIRING_SOON", label: "Expiring soon" },
];

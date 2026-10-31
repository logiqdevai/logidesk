import type { RequirementStatus } from "@/features/documents/interfaces/documents.interfaces";
import { lazyOption } from "./lazy-option";
import { RequirementStatusFormOptions } from "./requirement-status-form.options";

export const RequirementStatusFilterOptions: { id: RequirementStatus | "all" | "EXPIRING_SOON"; label: string }[] = [
  lazyOption<RequirementStatus | "all" | "EXPIRING_SOON">("all", "documents:filters.allStatuses"),
  ...RequirementStatusFormOptions.map((o) => lazyOption(o.id, `documents:status.requirement.${o.id}`)),
  lazyOption<RequirementStatus | "all" | "EXPIRING_SOON">("EXPIRING_SOON", "documents:filters.expiringSoon"),
];

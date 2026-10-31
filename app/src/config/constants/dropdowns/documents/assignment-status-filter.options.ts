import type { AssignmentStatus } from "@/features/assignments/interfaces/assignments.interfaces";
import { lazyOption } from "./lazy-option";
import { AssignmentStatusFormOptions } from "./assignment-status-form.options";

export const AssignmentStatusFilterOptions: { id: AssignmentStatus | "all"; label: string }[] = [
  lazyOption<AssignmentStatus | "all">("all", "documents:filters.allStatuses"),
  ...AssignmentStatusFormOptions.map((o) => lazyOption(o.id, `documents:status.assignment.${o.id}`)),
];

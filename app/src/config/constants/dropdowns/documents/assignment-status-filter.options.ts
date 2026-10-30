import type { AssignmentStatus } from "@/features/assignments/interfaces/assignments.interfaces";
import { AssignmentStatusFormOptions } from "./assignment-status-form.options";

export const AssignmentStatusFilterOptions: { id: AssignmentStatus | "all"; label: string }[] = [
  { id: "all", label: "All statuses" },
  ...AssignmentStatusFormOptions,
];

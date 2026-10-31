import type { AssignmentStatus } from "@/features/assignments/interfaces/assignments.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "documents:status.assignment";

export const AssignmentStatusFormOptions: { id: AssignmentStatus; label: string }[] = lazyOptions(["NOT_STARTED", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETE", "OVERDUE", "CANCELLED"] as const, PREFIX);

export function getAssignmentStatusLabel(id?: AssignmentStatus | string | null): string {
  return optionLabel(PREFIX, id);
}

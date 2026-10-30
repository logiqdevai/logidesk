import type { AssignmentStatus } from "@/features/assignments/interfaces/assignments.interfaces";

export const AssignmentStatusFormOptions: { id: AssignmentStatus; label: string }[] = [
  { id: "NOT_STARTED", label: "Not started" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "UNDER_REVIEW", label: "Under review" },
  { id: "COMPLETE", label: "Complete" },
  { id: "OVERDUE", label: "Overdue" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function getAssignmentStatusLabel(id?: AssignmentStatus | string | null): string {
  return AssignmentStatusFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

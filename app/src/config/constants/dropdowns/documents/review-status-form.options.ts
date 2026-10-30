import type { ReviewStatus } from "@/features/documents/interfaces/documents.interfaces";

export const ReviewStatusFormOptions: { id: ReviewStatus; label: string }[] = [
  { id: "PENDING", label: "Pending review" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
];

export function getReviewStatusLabel(id?: ReviewStatus | string | null): string {
  return ReviewStatusFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

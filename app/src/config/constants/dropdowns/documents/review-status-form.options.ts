import type { ReviewStatus } from "@/features/documents/interfaces/documents.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "documents:status.review";

export const ReviewStatusFormOptions: { id: ReviewStatus; label: string }[] = lazyOptions(["PENDING", "APPROVED", "REJECTED"] as const, PREFIX);

export function getReviewStatusLabel(id?: ReviewStatus | string | null): string {
  return optionLabel(PREFIX, id);
}

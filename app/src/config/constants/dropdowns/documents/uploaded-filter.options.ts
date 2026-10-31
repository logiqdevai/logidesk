import { lazyOption } from "./lazy-option";

export const UploadedFilterOptions: { id: string; label: string }[] = [
  lazyOption("any", "documents:filters.uploaded.any"),
  lazyOption("7d", "documents:filters.uploaded.7d"),
  lazyOption("30d", "documents:filters.uploaded.30d"),
  lazyOption("90d", "documents:filters.uploaded.90d"),
  lazyOption("never", "documents:filters.uploaded.never"),
];

export const SubmittedFilterOptions: { id: string; label: string }[] = [
  lazyOption("any", "documents:filters.submitted.any"),
  lazyOption("7d", "documents:filters.submitted.7d"),
  lazyOption("30d", "documents:filters.submitted.30d"),
  lazyOption("90d", "documents:filters.submitted.90d"),
  lazyOption("not_submitted", "documents:filters.submitted.not_submitted"),
];

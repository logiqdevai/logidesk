import { lazyOption } from "./lazy-option";

// id is the reason text sent to the API (kept in English); label is what the reviewer sees.
export const RejectReasonOptions: { id: string; label: string }[] = [
  lazyOption("Document is unreadable", "documents:rejectReasons.unreadable"),
  lazyOption("Wrong document type", "documents:rejectReasons.wrongType"),
  lazyOption("Document has expired", "documents:rejectReasons.expired"),
  lazyOption("Information does not match", "documents:rejectReasons.mismatch"),
  lazyOption("other", "documents:rejectReasons.other"),
];

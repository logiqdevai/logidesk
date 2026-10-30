import type { DocumentFile, RequirementStatus, UploadSource } from "@/features/documents/interfaces/documents.interfaces";

export const InboxStatuses = {
  RECEIVED: "RECEIVED",
  PROCESSING: "PROCESSING",
  MATCHED: "MATCHED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  UNMATCHED: "UNMATCHED",
  FAILED: "FAILED",
  DUPLICATE: "DUPLICATE",
  RESOLVED: "RESOLVED",
} as const;
export type InboxStatus = (typeof InboxStatuses)[keyof typeof InboxStatuses];

export const Confidences = { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" } as const;
export type Confidence = (typeof Confidences)[keyof typeof Confidences];

export interface InboxItem {
  id: string;
  source: UploadSource;
  processing_status: InboxStatus;
  needs_review: boolean;
  requires_approval: boolean;
  is_verified: boolean;
  is_ambiguous: boolean;
  confidence: Confidence | null;
  confidence_score: number | null;
  match_signals: Array<{ signal: string; weight: number; detail?: string }>;
  detected_document_type: string | null;
  received_at: string;
  review_action: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  failure_reason: string | null;
  client: { id: string; name: string; company: string | null } | null;
  suggested_assignment: { id: string; form_name: string } | null;
  suggested_requirement: { id: string; name: string; status: RequirementStatus; requires_approval: boolean } | null;
  public_submission: {
    id: string;
    submitter_name: string | null;
    submitter_email: string | null;
    submitter_company: string | null;
    answers: Record<string, unknown> | null;
    form: { name: string };
  } | null;
  document: DocumentFile | null;
}

export interface CandidateRequirement {
  id: string;
  name: string;
  status: RequirementStatus;
  assignment_id: string;
  form_name: string;
}

export interface InboxItemDetail extends InboxItem {
  candidate_requirements: CandidateRequirement[];
}

export interface InboxCounts {
  needs_review: number;
  processed: number;
  all: number;
}

export interface InboxQuery {
  page?: number;
  limit?: number;
  view?: "needs_review" | "processed" | "all";
  source?: string;
  status?: string;
  confidence?: string;
  client_id?: string;
  document_type?: string;
  search?: string;
  from?: string;
  to?: string;
  sort?: string;
}

export interface ResolveInboxDto {
  action: "approve" | "reject" | "confirm" | "change" | "dismiss";
  reason?: string;
  assignment_requirement_id?: string;
  note?: string;
}

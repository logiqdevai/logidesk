export const RequirementStatuses = {
  MISSING: "MISSING",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  NOT_REQUIRED: "NOT_REQUIRED",
} as const;
export type RequirementStatus = (typeof RequirementStatuses)[keyof typeof RequirementStatuses];

export const ReviewStatuses = { PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" } as const;
export type ReviewStatus = (typeof ReviewStatuses)[keyof typeof ReviewStatuses];

export const FileFormats = { PDF: "PDF", IMAGE: "IMAGE", WORD: "WORD", EXCEL: "EXCEL" } as const;
export type FileFormat = (typeof FileFormats)[keyof typeof FileFormats];

export const UploadSources = {
  EMPLOYEE_UPLOAD: "EMPLOYEE_UPLOAD",
  CLIENT_PORTAL: "CLIENT_PORTAL",
  EMAIL: "EMAIL",
  PUBLIC_PORTAL: "PUBLIC_PORTAL",
} as const;
export type UploadSource = (typeof UploadSources)[keyof typeof UploadSources];

export interface DocumentFile {
  id: string;
  title: string;
  original_filename: string;
  mime_type: string;
  file_format: FileFormat;
  size_bytes: number;
  source: UploadSource;
  client_id: string | null;
  assignment_id: string | null;
  assignment_requirement_id: string | null;
  uploaded_at: string;
  uploaded_by_name: string;
  uploaded_by_type: "employee" | "client" | "system";
  expiration_date: string | null;
  expiration_source: string | null;
  review_status: ReviewStatus;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  superseded_at: string | null;
  is_current: boolean;
  is_verified: boolean;
  notes: string | null;
  processed: boolean;
  duplicate_of: string | null;
}

export interface DocumentRow {
  assignment_requirement_id: string;
  name: string;
  is_required: boolean;
  accepted_formats: FileFormat[];
  status: RequirementStatus;
  expiring_soon: boolean;
  deadline: string | null;
  assignment_id: string;
  form: { id: string; name: string };
  client: { id: string; name: string; company: string | null };
  document: DocumentFile | null;
}

export interface DocumentDetail extends DocumentFile {
  client: { id: string; name: string; company: string | null } | null;
  requirement: {
    id: string;
    name: string;
    status: RequirementStatus;
    requires_approval: boolean;
    assignment_id: string;
    form: { id: string; name: string };
  } | null;
  versions: Array<{
    id: string;
    version_number: number;
    change_type: string;
    change_reason: string | null;
    expiration_date: string | null;
    review_status: ReviewStatus;
    created_at: string;
    changed_by: string;
  }>;
}

export interface DocumentQuery {
  page?: number;
  limit?: number;
  search?: string;
  client_id?: string;
  form_id?: string;
  assignment_id?: string;
  document_type?: string;
  status?: string;
  source?: string;
  file_format?: string;
  expiration?: string;
  uploaded?: string;
  sort?: string;
}

export interface UploadDocumentDto {
  assignment_requirement_id: string;
  files: File[];
  expiration_date?: string;
  notes?: string;
}

export interface ReviewDocumentDto {
  decision: "APPROVED" | "REJECTED";
  reason?: string;
}

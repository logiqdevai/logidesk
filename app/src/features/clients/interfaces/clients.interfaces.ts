import type { OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";
import type { FileFormat, RequirementStatus, ReviewStatus, UploadSource } from "@/features/documents/interfaces/documents.interfaces";

export const PortalStatuses = { ACTIVE: "active", INVITED: "invited", NOT_INVITED: "not_invited", DISABLED: "disabled" } as const;
export type PortalStatus = (typeof PortalStatuses)[keyof typeof PortalStatuses];

export interface ClientListItem {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
  assignees: Array<{ member_id: string; name: string }>;
  portal_status: PortalStatus;
  forms_count: number;
  overdue_count: number;
  requirements_total: number;
  requirements_completed: number;
  requirements_missing: number;
  requirements_expired: number;
  progress_percent: number;
}

export interface ClientRequirementItem {
  assignment_requirement_id: string;
  assignment_id: string;
  name: string;
  form_name: string;
  status: RequirementStatus;
  deadline: string | null;
  document: { id: string; uploaded_at: string; expiration_date: string | null; source: UploadSource; original_filename: string; file_format: FileFormat } | null;
}

export interface ClientDetail {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  address: string | null;
  company_info: string | null;
  status: "ACTIVE" | "ARCHIVED";
  archived_at: string | null;
  created_at: string;
  created_by: string | null;
  assignees: Array<{ member_id: string; name: string; email: string; role: OrganizationRole }>;
  portal: { status: PortalStatus; last_login_at: string | null; invited_at: string | null; email: string | null };
  overview: {
    total: number;
    approved: number;
    under_review: number;
    missing: number;
    rejected: number;
    expired: number;
    expiring_soon: number;
    progress_percent: number;
    missing_items: ClientRequirementItem[];
    expired_items: ClientRequirementItem[];
    expiring_items: ClientRequirementItem[];
    review_items: ClientRequirementItem[];
    recent_documents: Array<{
      id: string;
      title: string;
      original_filename: string;
      file_format: FileFormat;
      uploaded_at: string;
      source: UploadSource;
      review_status: ReviewStatus;
      form_name: string | null;
    }>;
  };
}

export interface ClientQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  employee_id?: string;
  portal?: string;
  attention?: string;
  sort?: string;
}

export interface SaveClientDto {
  first_name: string;
  last_name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  address?: string | null;
  company_info?: string | null;
  assignee_member_ids?: string[];
  internal_note?: string | null;
  send_invitation?: boolean;
}

export interface ClientNote {
  id: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author_name: string;
  can_delete: boolean;
}

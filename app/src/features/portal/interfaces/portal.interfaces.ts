import type { AssignmentStatus } from "@/features/assignments/interfaces/assignments.interfaces";
import type { FileFormat, RequirementStatus, ReviewStatus } from "@/features/documents/interfaces/documents.interfaces";
import type { FormDefinition } from "@/features/forms/interfaces/forms.interfaces";

export interface PortalMe {
  client: { id: string; first_name: string; last_name: string; company: string | null; email: string | null; phone: string | null; tax_id: string | null; address: string | null };
  account: { email: string; notify_reminders: boolean; notify_review_updates: boolean; activated_at: string | null };
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    welcome_message: string | null;
    accent_color: string | null;
  };
}

export interface PortalFormItem {
  id: string;
  title: string;
  description: string | null;
  assigned_at: string;
  deadline: string | null;
  status: AssignmentStatus;
  progress_percent: number;
  requirements_total: number;
  requirements_completed: number;
  requirements_missing: number;
  requirements_expired: number;
  response_status: "DRAFT" | "SUBMITTED";
  last_saved_at: string | null;
}

export interface PortalAction {
  kind: "rejected" | "expired" | "missing" | "expiring" | "awaiting_review";
  assignment_requirement_id: string;
  assignment_id: string;
  name: string;
  form_name: string;
  status: RequirementStatus;
  is_required: boolean;
  deadline: string | null;
  expiration_date: string | null;
  rejection_reason: string | null;
}

export interface PortalOverview {
  progress: {
    total: number;
    approved: number;
    percent: number;
    missing: number;
    awaiting_review: number;
    rejected: number;
    expired: number;
    expiring_soon: number;
  };
  next_actions: PortalAction[];
  forms: PortalFormItem[];
}

export interface PortalDocument {
  id: string;
  title: string;
  original_filename: string;
  file_format: FileFormat;
  size_bytes: number;
  uploaded_at: string;
  uploaded_by_type: "employee" | "client" | "system";
  expiration_date: string | null;
  review_status: ReviewStatus;
  rejection_reason: string | null;
  is_current: boolean;
  status: RequirementStatus | "REPLACED" | null;
  assignment_id: string | null;
  form_name: string | null;
}

export interface PublicPortalOverview {
  organization: { name: string; logo_url: string | null };
  welcome_message: string | null;
  accent_color: string | null;
  forms: Array<{ id: string; title: string; description: string | null; document_count: number; field_count: number }>;
}

export interface PublicForm {
  id: string;
  organization_name: string;
  accent_color: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  definition: FormDefinition;
  requirements: Array<{
    field_key: string;
    name: string;
    description: string | null;
    instructions: string | null;
    is_required: boolean;
    accepted_formats: FileFormat[];
    max_file_size_mb: number;
    max_files: number;
  }>;
}

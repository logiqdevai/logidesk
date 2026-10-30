import type { FileFormat } from "@/features/documents/interfaces/documents.interfaces";
import type { ExpirationPolicy } from "@/features/forms/interfaces/forms.interfaces";

export const PortalAccessModes = { PRIVATE: "PRIVATE", PUBLIC: "PUBLIC" } as const;
export type PortalAccessMode = (typeof PortalAccessModes)[keyof typeof PortalAccessModes];

export interface PortalSettings {
  access_mode: PortalAccessMode;
  public_slug: string | null;
  welcome_message: string | null;
  accent_color: string | null;
  invitation_validity_days: number;
  invite_on_first_assignment: boolean;
  require_email_verification: boolean;
}

export interface DocumentSettings {
  default_max_upload_mb: number;
  accepted_formats: FileFormat[];
  default_expiration_policy: ExpirationPolicy;
  default_expiration_days: number | null;
  require_approval_by_default: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  time_zone: string;
  default_language: string;
  storage_limit_bytes: number;
  created_at: string;
  portal_settings: PortalSettings;
  document_settings: DocumentSettings;
}

export interface CreateOrganizationDto {
  name: string;
  time_zone?: string;
}

export type UpdateOrganizationDto = Partial<Pick<Organization, "name" | "contact_email" | "contact_phone" | "address" | "time_zone" | "default_language">>;
export type UpdatePortalSettingsDto = Partial<Omit<PortalSettings, "public_slug">> & { regenerate_public_link?: boolean };
export type UpdateDocumentSettingsDto = Partial<DocumentSettings>;

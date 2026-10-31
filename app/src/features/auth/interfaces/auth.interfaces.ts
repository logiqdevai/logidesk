export const OrganizationRoles = { OWNER: "OWNER", ADMIN: "ADMIN", MEMBER: "MEMBER" } as const;
export type OrganizationRole = (typeof OrganizationRoles)[keyof typeof OrganizationRoles];

export const ContextTypes = { ACCOUNT: "account", WORKSPACE: "workspace", PORTAL: "portal" } as const;
export type ContextType = (typeof ContextTypes)[keyof typeof ContextTypes];

export interface AuthContext {
  type: ContextType;
  organization_id?: string | null;
  client_user_id?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  language?: "en" | "el";
  created_at: string;
}

export interface SessionTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  context?: AuthContext;
}

export interface WorkspaceSummary {
  organization_id: string;
  name: string;
  logo_url: string | null;
  role: OrganizationRole;
  permissions: string[];
  member_count: number;
}

export interface PortalSummary {
  client_user_id: string;
  organization_id: string;
  organization_name: string;
  logo_url: string | null;
  client_name: string;
  company: string | null;
}

export interface MeResponse {
  user: AuthUser;
  workspaces: WorkspaceSummary[];
  portals: PortalSummary[];
}

export interface SignInDto {
  email: string;
  password: string;
}

export interface SignUpDto extends SignInDto {
  first_name: string;
  last_name: string;
  country: string;
}

export interface InvitationInfo {
  type: "TEAM" | "CLIENT";
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  email: string;
  organization_name: string;
  organization_logo_url: string | null;
  role: OrganizationRole | null;
  client_name: string | null;
  invited_by: string | null;
  message: string | null;
  account_exists: boolean;
}

/** Permissions mirrored from the API catalogue (used only to hide UI; the API enforces). */
export const Permissions = {
  CLIENTS_VIEW_ALL: "clients.view_all",
  CLIENTS_CREATE: "clients.create",
  CLIENTS_MANAGE: "clients.manage",
  CLIENTS_ARCHIVE: "clients.archive",
  CLIENTS_ASSIGN_EMPLOYEES: "clients.assign_employees",
  FORMS_MANAGE: "forms.manage",
  ASSIGNMENTS_MANAGE: "assignments.manage",
  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_REVIEW: "documents.review",
  DOCUMENTS_DELETE: "documents.delete",
  REMINDERS_SEND: "reminders.send",
  NOTIFICATIONS_MANAGE: "notifications.manage",
  TEAM_MANAGE: "team.manage",
  TEAM_GRANT_OWNER: "team.grant_owner",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_VIEW: "audit.view",
} as const;
export type Permission = (typeof Permissions)[keyof typeof Permissions];

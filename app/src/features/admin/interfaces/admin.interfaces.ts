import type { AccountRole, OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";

export interface AdminUserWorkspace {
  organization_id: string;
  name: string;
  role: OrganizationRole;
  status: "ACTIVE" | "SUSPENDED";
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  account_role: AccountRole;
  email_verified: boolean;
  portal_access: boolean;
  last_login_at: string | null;
  created_at: string;
  workspaces: AdminUserWorkspace[];
}

export interface AdminInvitation {
  id: string;
  email: string;
  account_role: AccountRole | null;
  expires_at: string;
  expired: boolean;
  invited_by: string | null;
  created_at: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  invitations: AdminInvitation[];
  organizations: { id: string; name: string }[];
}

export interface AdminUserFilters {
  search?: string;
  organization_id?: string;
  workspace_role?: OrganizationRole;
  account_role?: AccountRole;
  verification?: "verified" | "unverified";
  access?: "workspace" | "portal" | "none";
  last_login?: "7" | "30" | "90" | "never";
  joined?: "7" | "30" | "90";
}

export type InvitableAccountRole = "USER" | "SUPPORT" | "ADMIN";

export interface AdminInviteUserDto {
  email: string;
  role: InvitableAccountRole;
  /** Language of the invitation email. */
  language: "el" | "en";
  message?: string;
}

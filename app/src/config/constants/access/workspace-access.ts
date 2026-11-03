import { AccountRoles } from "@/features/auth/interfaces/auth.interfaces";
import type { RoleAccess } from "@/hooks/use-role-access";

/** Advanced settings visible only to platform admins. */
export const AdminOnlyAccess: RoleAccess = {
  accountRoles: [AccountRoles.ADMIN, AccountRoles.SUPER_ADMIN],
};

/**
 * Per-document expiration dates (policies, expiry badges, "expiring/expired" views and reminders).
 * Hidden from everyone but platform admins while forms work with a submission deadline instead.
 */
export const DocumentExpirationAccess: RoleAccess = {
  accountRoles: [AccountRoles.ADMIN, AccountRoles.SUPER_ADMIN],
};

/** Named role sets used by `<RoleGate>` / `useRoleAccess`. Add new ones here, never inline in pages. */
export const CreateWorkspaceAccess: RoleAccess = {
  accountRoles: [AccountRoles.ADMIN, AccountRoles.SUPER_ADMIN],
  allowNewAccounts: true,
};

/** Deleting another administrator (the API enforces it too). */
export const SuperAdminAccess: RoleAccess = {
  accountRoles: [AccountRoles.SUPER_ADMIN],
};

/** Managing the open workspace's team: platform admins plus the workspace's Owner / Admin. */
export const TeamAccess: RoleAccess = {
  accountRoles: [AccountRoles.ADMIN, AccountRoles.SUPER_ADMIN],
  workspaceRoles: ["OWNER", "ADMIN"],
};

/** The platform-wide admin area (all users, cross-workspace invitations). Same roles as `AdminOnlyAccess`; kept separate so it can diverge. */
export const PlatformAdminAccess: RoleAccess = {
  accountRoles: [AccountRoles.ADMIN, AccountRoles.SUPER_ADMIN],
};

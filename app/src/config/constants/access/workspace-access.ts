import { AccountRoles } from "@/features/auth/interfaces/auth.interfaces";
import type { RoleAccess } from "@/hooks/use-role-access";

/** Advanced settings visible only to platform admins. */
export const AdminOnlyAccess: RoleAccess = {
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

/** The platform-wide admin area (all users, cross-workspace invitations). Same roles as `AdminOnlyAccess`; kept separate so it can diverge. */
export const PlatformAdminAccess: RoleAccess = {
  accountRoles: [AccountRoles.ADMIN, AccountRoles.SUPER_ADMIN],
};

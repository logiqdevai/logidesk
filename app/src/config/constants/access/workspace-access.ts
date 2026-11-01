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

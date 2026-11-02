import { useMe } from "@/features/auth/hooks/use-auth";
import { useAuthStore } from "@/stores/auth";
import { environments } from "@/config/environments";
import type { AccountRole, OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";

/** Who may see / use something. The rules are OR-ed: matching any one grants access. Nothing set = nobody. */
export interface RoleAccess {
  /** Account-level roles (`user.role`), e.g. ADMIN / SUPER_ADMIN. */
  accountRoles?: readonly AccountRole[];
  /** Role in the currently open workspace (OWNER / ADMIN / MEMBER). */
  workspaceRoles?: readonly OrganizationRole[];
  /** Also allow a brand-new account that has no workspace and no client portal yet (e.g. creating its first workspace). */
  allowNewAccounts?: boolean;
}

/**
 * UI-only visibility check — the API still enforces real permissions.
 * Returns false while the account is loading, so gated UI never flashes.
 */
export function useRoleAccess({ accountRoles, workspaceRoles, allowNewAccounts }: RoleAccess): boolean {
  const me = useMe().data;
  const organizationId = useAuthStore((s) => s.context.organization_id);
  if (!me) return false;
  // `VITE_HIDE_ADMIN_UI=true` hides everything granted purely by an account-level (admin / super admin) role.
  if (!environments.HIDE_ADMIN_UI && accountRoles?.length && me.user.role && accountRoles.includes(me.user.role)) return true;
  if (workspaceRoles?.length) {
    const active = me.workspaces.find((w) => w.organization_id === organizationId);
    if (active && workspaceRoles.includes(active.role)) return true;
  }
  return !!allowNewAccounts && !me.workspaces.length && !me.portals.length;
}

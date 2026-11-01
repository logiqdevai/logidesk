import type { FC, ReactNode } from "react";
import { useRoleAccess, type RoleAccess } from "@/hooks/use-role-access";

interface RoleGateProps extends RoleAccess {
  children: ReactNode;
  /** Rendered when the user lacks access (default: nothing). */
  fallback?: ReactNode;
}

/**
 * Renders `children` only for the listed roles. Use it for EVERY role-conditional element
 * (buttons, menu items, sections) instead of ad-hoc `role === ...` checks.
 *
 *   <RoleGate accountRoles={[AccountRoles.ADMIN, AccountRoles.SUPER_ADMIN]}>…</RoleGate>
 *   <RoleGate {...CreateWorkspaceAccess}>…</RoleGate>
 *
 * Visibility only — the API must still enforce access.
 */
export const RoleGate: FC<RoleGateProps> = ({ children, fallback = null, ...access }) => {
  const allowed = useRoleAccess(access);
  return <>{allowed ? children : fallback}</>;
};

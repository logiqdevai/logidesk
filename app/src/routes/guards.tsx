import type { FC, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";

/** Any signed-in user. */
export const RequireAuth: FC<{ children: ReactNode }> = ({ children }) => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to={`${Routes.auth.sign_in}?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
};

/** Employee pages: a workspace must be open (portal sessions are not interchangeable). */
export const RequireWorkspace: FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoggedIn, context } = useAuthStore();
  if (!isLoggedIn) return <Navigate to={Routes.auth.sign_in} replace />;
  if (context.type !== "workspace") return <Navigate to={Routes.workspaces} replace />;
  return <>{children}</>;
};

/** Client portal pages. */
export const RequirePortal: FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoggedIn, context } = useAuthStore();
  if (!isLoggedIn) return <Navigate to={Routes.auth.sign_in} replace />;
  if (context.type !== "portal") return <Navigate to={Routes.workspaces} replace />;
  return <>{children}</>;
};

/** Landing redirect by session state. */
export const HomeRedirect: FC = () => {
  const { isLoggedIn, context } = useAuthStore();
  if (!isLoggedIn) return <Navigate to={Routes.auth.sign_in} replace />;
  if (context.type === "workspace") return <Navigate to={Routes.dashboard} replace />;
  if (context.type === "portal") return <Navigate to={Routes.portal.root} replace />;
  return <Navigate to={Routes.workspaces} replace />;
};

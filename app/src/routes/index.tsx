import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { Routes } from "@/routes/routes";
import { HomeRedirect, RequireAuth, RequirePortal, RequireWorkspace } from "@/routes/guards";
import BusinessShell from "@/components/layout/business-shell";
import PortalShell from "@/components/layout/portal-shell";
import { RouteError } from "@/components/layout/route-error";
import WorkspacesPage from "@/pages/workspaces";


/** Route-level code splitting: each page is loaded on first visit. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const page = (load: () => Promise<any>, name = "default") => async () => ({ Component: (await load())[name] });

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
      { path: Routes.root, element: <HomeRedirect /> },
      { path: Routes.auth.root, lazy: page(() => import("@/pages/auth")) },
      { path: Routes.auth.forgot_password, lazy: page(() => import("@/pages/auth/pages/account-recovery"), "ForgotPasswordPage") },
      { path: Routes.auth.reset_password, lazy: page(() => import("@/pages/auth/pages/account-recovery"), "ResetPasswordPage") },
      { path: Routes.auth.verify_email, lazy: page(() => import("@/pages/auth/pages/account-recovery"), "VerifyEmailPage") },
      { path: Routes.contact, lazy: page(() => import("@/pages/contact")) },
      { path: "/p/:slug", lazy: page(() => import("@/pages/public-portal"), "PublicPortalPage") },
      { path: "/p/:slug/forms/:formId", lazy: page(() => import("@/pages/public-portal"), "PublicFormPage") },
      {
        path: Routes.workspaces,
        element: (
          <RequireAuth>
            <WorkspacesPage />
          </RequireAuth>
        ),
      },
      {
        element: (
          <RequireWorkspace>
            <BusinessShell />
          </RequireWorkspace>
        ),
        children: [
          { path: Routes.dashboard, lazy: page(() => import("@/pages/dashboard")) },
          { path: Routes.clients.root, lazy: page(() => import("@/pages/clients")) },
          { path: Routes.clients.new, lazy: page(() => import("@/pages/clients/pages/client-form")) },
          { path: "/clients/:id", lazy: page(() => import("@/pages/clients/pages/client-detail")) },
          { path: "/clients/:id/edit", lazy: page(() => import("@/pages/clients/pages/client-form")) },
          { path: "/assignments/:id", lazy: page(() => import("@/pages/assignments")) },
          { path: Routes.documents, lazy: page(() => import("@/pages/documents")) },
          { path: Routes.files, lazy: page(() => import("@/pages/files")) },
          { path: Routes.inbox.root, lazy: page(() => import("@/pages/inbox")) },
          { path: Routes.forms.root, lazy: page(() => import("@/pages/forms")) },
          { path: Routes.forms.new, lazy: page(() => import("@/pages/forms/pages/form-builder")) },
          { path: "/forms/:id/edit", lazy: page(() => import("@/pages/forms/pages/form-builder")) },
          { path: "/forms/:id/submissions", lazy: page(() => import("@/pages/forms/pages/form-submissions")) },
          { path: Routes.notifications, lazy: page(() => import("@/pages/notifications")) },
          { path: Routes.team, lazy: page(() => import("@/pages/team")) },
          { path: Routes.admin.users, lazy: page(() => import("@/pages/admin/users")) },
          { path: Routes.settings.root, lazy: page(() => import("@/pages/settings")) },
        ],
      },
      {
        element: (
          <RequirePortal>
            <PortalShell />
          </RequirePortal>
        ),
        children: [
          { path: Routes.portal.root, lazy: page(() => import("@/pages/portal")) },
          { path: Routes.portal.forms, lazy: page(() => import("@/pages/portal/pages/portal-pages"), "PortalFormsPage") },
          { path: "/portal/forms/:id", lazy: page(() => import("@/pages/portal/pages/portal-form")) },
          { path: Routes.portal.documents, lazy: page(() => import("@/pages/portal/pages/portal-pages"), "PortalDocumentsPage") },
          { path: Routes.portal.information, element: <Navigate to={Routes.portal.account} replace /> },
          { path: Routes.portal.account, lazy: page(() => import("@/pages/portal/pages/portal-pages"), "PortalAccountPage") },
        ],
      },
      { path: "*", element: <Navigate to={Routes.root} replace /> },
    ],
  },
]);

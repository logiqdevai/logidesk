/** Every frontend path. Never hardcode URL strings elsewhere. */
export const Routes = {
  root: "/",
  auth: {
    root: "/auth",
    sign_in: "/auth",
    sign_up: "/auth?mode=signup",
    invite: (token: string) => `/auth?invite=${encodeURIComponent(token)}`,
    forgot_password: "/auth/forgot-password",
    reset_password: "/auth/reset-password",
    verify_email: "/auth/verify-email",
  },
  workspaces: "/workspaces",
  dashboard: "/dashboard",
  clients: {
    root: "/clients",
    new: "/clients/new",
    detail: (id: string) => `/clients/${id}`,
    edit: (id: string) => `/clients/${id}/edit`,
    tab: (id: string, tab: string) => `/clients/${id}?tab=${tab}`,
  },
  assignments: {
    detail: (id: string) => `/assignments/${id}`,
    edit: (id: string) => `/assignments/${id}?edit=1`,
  },
  documents: "/documents",
  files: "/files",
  inbox: {
    root: "/inbox",
    item: (id: string) => `/inbox?item=${id}`,
  },
  forms: {
    root: "/forms",
    new: "/forms/new",
    edit: (id: string) => `/forms/${id}/edit`,
    submissions: (id: string) => `/forms/${id}/submissions`,
  },
  notifications: "/notifications",
  team: "/team",
  settings: {
    root: "/settings",
    tab: (tab: string) => `/settings?tab=${tab}`,
  },
  portal: {
    root: "/portal",
    forms: "/portal/forms",
    form: (id: string) => `/portal/forms/${id}`,
    documents: "/portal/documents",
    information: "/portal/information",
    account: "/portal/account",
  },
  public_portal: {
    root: (slug: string) => `/p/${slug}`,
    form: (slug: string, formId: string) => `/p/${slug}/forms/${formId}`,
  },
};

import { useState, type FC } from "react";
import { Navigate } from "react-router-dom";
import { MoreHorizontal, Search, Trash2, UserPlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Routes } from "@/routes/routes";
import { RoleGate } from "@/components/access/role-gate";
import { PlatformAdminAccess, SuperAdminAccess } from "@/config/constants/access/workspace-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/use-role-access";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InitialsAvatar, PageHeader, TableSkeleton } from "@/components/ui/page-elements";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { useMe } from "@/features/auth/hooks/use-auth";
import { useAdminDeletionPreview, useAdminUsers, useDeleteAdminUser, useInviteAdminUser } from "@/features/admin/hooks/use-admin";
import { OrganizationRoleFormOptions, getOrganizationRoleLabel } from "@/config/constants/dropdowns/users/organization-role-form.options";
import { useDebounced } from "@/hooks/use-debounced";
import { AccountRoles } from "@/features/auth/interfaces/auth.interfaces";
import { formatDate, formatRelative } from "@/lib/format";
import type { AdminUser, AdminUserFilters, InvitableAccountRole } from "@/features/admin/interfaces/admin.interfaces";

const ALL = "all";
type FilterKey = "organization_id" | "workspace_role" | "account_role" | "access" | "verification" | "last_login" | "joined";
const EMPTY_FILTERS: Record<FilterKey, string> = {
  organization_id: ALL,
  workspace_role: ALL,
  account_role: ALL,
  access: ALL,
  verification: ALL,
  last_login: ALL,
  joined: ALL,
};

const AdminUsersContent: FC = () => {
  const { t } = useTranslation("admin");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, string>>(EMPTY_FILTERS);
  const setFilter = (key: FilterKey) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const activeFilterCount = Object.values(filters).filter((v) => v !== ALL).length;
  const debouncedSearch = useDebounced(search.trim());
  const query = useAdminUsers({
    search: debouncedSearch || undefined,
    ...(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ALL)) as AdminUserFilters),
  });
  const withAll = (label: string, options: ReadonlyArray<{ id: string; label: string }>) => [{ id: ALL, label }, ...options];
  const daysOptions = (keys: string[]) => keys.map((k) => ({ id: k, label: t(`users.filters.days.${k}`) }));
  const invite = useInviteAdminUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableAccountRole>("USER");
  const [language, setLanguage] = useState<"el" | "en">("el");
  const [message, setMessage] = useState("");
  const data = query.data;

  // Deleting a user (and the workspaces they solely own). The API enforces the same rules.
  const me = useMe().data;
  const canDeleteAdmins = useRoleAccess(SuperAdminAccess);
  const deleteUser = useDeleteAdminUser();
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const preview = useAdminDeletionPreview(deleteTarget?.id ?? null);
  const closeDelete = () => {
    if (deleteUser.isPending) return;
    setDeleteTarget(null);
    setConfirmEmail("");
  };
  const isPlatformAdmin = (u: AdminUser) => u.account_role === AccountRoles.ADMIN || u.account_role === AccountRoles.SUPER_ADMIN;
  const copyEmail = (email: string) => {
    void navigator.clipboard?.writeText(email).then(() => toast({ title: t("users.actions.copied") }));
  };
  const organizations = data?.organizations ?? [];

  return (
    <>
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
        actions={
          <Button
            onClick={() => {
              setEmail("");
              setRole("USER");
              setLanguage("el");
              setMessage("");
              setInviteOpen(true);
            }}
          >
            <UserPlus />
            {t("users.inviteButton")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <Input className="pl-9" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("users.searchPlaceholder")} aria-label={t("users.searchLabel")} />
        </div>
        <FilterSelect
          label={t("users.filters.workspace")}
          value={filters.organization_id}
          onChange={setFilter("organization_id")}
          options={withAll(t("users.filters.allWorkspaces"), organizations.map((o) => ({ id: o.id, label: o.name })))}
        />
        <FilterSelect
          label={t("users.filters.workspaceRole")}
          value={filters.workspace_role}
          onChange={setFilter("workspace_role")}
          options={withAll(t("users.filters.allWorkspaceRoles"), OrganizationRoleFormOptions)}
        />
        <FilterSelect
          label={t("users.filters.accountType")}
          value={filters.account_role}
          onChange={setFilter("account_role")}
          options={withAll(t("users.filters.allAccountTypes"), [
            { id: AccountRoles.USER, label: t("users.filters.accountRoles.USER") },
            { id: AccountRoles.ADMIN, label: t("users.filters.accountRoles.ADMIN") },
            { id: AccountRoles.SUPER_ADMIN, label: t("users.filters.accountRoles.SUPER_ADMIN") },
            { id: AccountRoles.SUPPORT, label: t("users.filters.accountRoles.SUPPORT") },
          ])}
        />
        <FilterSelect
          label={t("users.filters.access")}
          value={filters.access}
          onChange={setFilter("access")}
          options={withAll(t("users.filters.allAccess"), [
            { id: "workspace", label: t("users.filters.accessOptions.workspace") },
            { id: "portal", label: t("users.filters.accessOptions.portal") },
            { id: "none", label: t("users.filters.accessOptions.none") },
          ])}
        />
        <FilterSelect
          label={t("users.filters.verification")}
          value={filters.verification}
          onChange={setFilter("verification")}
          options={withAll(t("users.filters.allVerification"), [
            { id: "verified", label: t("users.filters.verified") },
            { id: "unverified", label: t("users.unverified") },
          ])}
        />
        <FilterSelect
          label={t("users.filters.lastLogin")}
          value={filters.last_login}
          onChange={setFilter("last_login")}
          options={withAll(t("users.filters.anyLastLogin"), [...daysOptions(["7", "30", "90"]).map((o) => ({ ...o, label: t("users.filters.loggedInWithin", { days: o.id }) })), { id: "never", label: t("users.never") }])}
        />
        <FilterSelect
          label={t("users.filters.joined")}
          value={filters.joined}
          onChange={setFilter("joined")}
          options={withAll(t("users.filters.anyJoined"), daysOptions(["7", "30", "90"]).map((o) => ({ ...o, label: t("users.filters.joinedWithin", { days: o.id }) })))}
        />
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            <X />
            {t("users.filters.clear", { count: activeFilterCount })}
          </Button>
        )}
      </div>

      <section className="card">
        {query.isPending ? (
          <TableSkeleton rows={5} />
        ) : (
          <div className="table-wrap">
            <Table className="table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.columns.user")}</TableHead>
                  <TableHead>{t("users.columns.workspaces")}</TableHead>
                  <TableHead>{t("users.columns.lastLogin")}</TableHead>
                  <TableHead>{t("users.columns.joined")}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("users.columns.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="muted py-8 text-center">
                      {t("users.empty")}
                    </TableCell>
                  </TableRow>
                )}
                {data?.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={u.name} />
                        <div>
                          <div className="cell-main">
                            {u.name}
                            {(u.account_role === AccountRoles.ADMIN || u.account_role === AccountRoles.SUPER_ADMIN) && (
                              <StatusBadge tone="coral" className="ml-2">
                                {t("users.platformAdmin")}
                              </StatusBadge>
                            )}
                            {!u.email_verified && (
                              <StatusBadge tone="notreq" className="ml-2">
                                {t("users.unverified")}
                              </StatusBadge>
                            )}
                          </div>
                          <div className="cell-sub">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.workspaces.map((w) => (
                          <StatusBadge key={w.organization_id} tone={w.role === "OWNER" ? "coral" : "plain"}>
                            {w.name} · {getOrganizationRoleLabel(w.role)}
                          </StatusBadge>
                        ))}
                        {u.portal_access && <StatusBadge tone="employee">{t("users.portalOnly")}</StatusBadge>}
                        {!u.workspaces.length && !u.portal_access && <span className="muted">{t("users.noWorkspace")}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{u.last_login_at ? formatRelative(u.last_login_at) : t("users.never")}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="actions">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label={t("users.actions.for", { name: u.name })}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => copyEmail(u.email)}>{t("users.actions.copyEmail")}</DropdownMenuItem>
                          {(!isPlatformAdmin(u) || canDeleteAdmins) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={u.id === me?.user.id}
                                onSelect={() => {
                                  setConfirmEmail("");
                                  setDeleteTarget(u);
                                }}
                              >
                                <Trash2 />
                                {t("users.actions.delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {!!data?.invitations.length && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-medium">{t("users.pendingTitle")}</h2>
          <div className="card">
            <div className="table-wrap">
              <Table className="table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("users.pendingColumns.email")}</TableHead>
                    <TableHead>{t("users.pendingColumns.role")}</TableHead>
                    <TableHead>{t("users.pendingColumns.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.invitations.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div className="cell-main">{i.email}</div>
                        <div className="cell-sub">
                          {i.invited_by ? t("users.invitedBy", { when: formatRelative(i.created_at), by: i.invited_by }) : t("users.invitedWhen", { when: formatRelative(i.created_at) })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone="plain">{i.account_role ? t(`users.filters.accountRoles.${i.account_role}`) : "—"}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={i.expired ? "notreq" : "invited"}>{i.expired ? t("users.expired") : t("users.invited")}</StatusBadge>
                        <div className="caption">{t("users.expires", { date: formatDate(i.expires_at) })}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && closeDelete()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="display text-[26px] font-medium">{t("delete.title")}</DialogTitle>
            <DialogDescription>{t("delete.description", { name: deleteTarget?.name, email: deleteTarget?.email })}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 text-sm">
            {preview.isPending ? (
              <TableSkeleton rows={2} />
            ) : preview.data ? (
              <>
                {preview.data.workspaces_deleted.length > 0 && (
                  <div className="border-destructive/40 bg-destructive/5 rounded-md border p-3">
                    <p className="text-destructive font-medium">{t("delete.wipedTitle", { count: preview.data.workspaces_deleted.length })}</p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {preview.data.workspaces_deleted.map((w) => (
                        <li key={w.id}>
                          <b>{w.name}</b> <span className="muted">· {t("delete.counts", { members: w.members, clients: w.clients, documents: w.documents })}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="muted mt-2">{t("delete.wipedHint")}</p>
                  </div>
                )}
                {preview.data.workspaces_kept.length > 0 && (
                  <div>
                    <p className="font-medium">{t("delete.keptTitle")}</p>
                    <p className="muted mt-1">{preview.data.workspaces_kept.map((w) => `${w.name} (${getOrganizationRoleLabel(w.role)})`).join(", ")}</p>
                  </div>
                )}
                {!preview.data.workspaces_deleted.length && !preview.data.workspaces_kept.length && <p className="muted">{t("delete.noWorkspaces")}</p>}
              </>
            ) : (
              <p className="text-destructive">{preview.error?.message ?? t("api.couldNotLoadPreview")}</p>
            )}
            <div className="field">
              <Label htmlFor="admin-del-confirm">{t("delete.confirmLabel", { email: deleteTarget?.email })}</Label>
              <Input id="admin-del-confirm" autoComplete="off" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={deleteTarget?.email} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDelete} disabled={deleteUser.isPending}>
              {t("dialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteUser.isPending}
              disabled={!preview.data || confirmEmail.trim().toLowerCase() !== deleteTarget?.email.toLowerCase()}
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id, { onSuccess: () => { setDeleteTarget(null); setConfirmEmail(""); } })}
            >
              {t("delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={(o) => !invite.isPending && setInviteOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[26px] font-medium">{t("dialog.title")}</DialogTitle>
            <DialogDescription>{t("dialog.description")}</DialogDescription>
          </DialogHeader>
          <form
            id="admin-invite-form"
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate({ email, role, language, message: message || undefined }, { onSuccess: () => setInviteOpen(false) });
            }}
          >
            <div className="field">
              <Label htmlFor="admin-inv-email">{t("dialog.email")}</Label>
              <Input id="admin-inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("dialog.emailPlaceholder")} />
            </div>
            <div className="field">
              <Label>{t("dialog.role")}</Label>
              <FilterSelect
                label={t("dialog.role")}
                size="default"
                className="w-full"
                value={role}
                onChange={(v) => setRole(v as InvitableAccountRole)}
                options={(["USER", "SUPPORT", "ADMIN"] as const).map((r) => ({ id: r, label: t(`users.filters.accountRoles.${r}`) }))}
              />
              <span className="hint">{t(`dialog.roleHints.${role}`)}</span>
            </div>
            <div className="field">
              <Label>{t("dialog.language")}</Label>
              <FilterSelect
                label={t("dialog.language")}
                size="default"
                className="w-full"
                value={language}
                onChange={(v) => setLanguage(v as "el" | "en")}
                options={[
                  { id: "el", label: "Ελληνικά" },
                  { id: "en", label: "English" },
                ]}
              />
              <span className="hint">{t("dialog.languageHint")}</span>
            </div>
            <div className="field">
              <Label htmlFor="admin-inv-msg">
                {t("dialog.message")} <span className="soft">({t("dialog.optional")})</span>
              </Label>
              <Textarea id="admin-inv-msg" placeholder={t("dialog.messagePlaceholder")} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={invite.isPending}>
              {t("dialog.cancel")}
            </Button>
            <Button type="submit" form="admin-invite-form" loading={invite.isPending} disabled={!/^\S+@\S+\.\S+$/.test(email)}>
              {t("dialog.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Platform admins only (visibility); the API enforces access too. */
const AdminUsersPage: FC = () => {
  // RoleGate is false until the account has loaded, so wait for it before redirecting.
  const me = useMe();
  if (me.isPending) return <TableSkeleton rows={5} />;
  return (
    <RoleGate {...PlatformAdminAccess} fallback={<Navigate to={Routes.dashboard} replace />}>
      <AdminUsersContent />
    </RoleGate>
  );
};

export default AdminUsersPage;

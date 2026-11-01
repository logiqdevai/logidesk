import { useEffect, useState, type FC } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Plus, Search, Send, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState, InitialsAvatar, PageHeader, ProgressCell, TableSkeleton } from "@/components/ui/page-elements";
import { PortalStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { useClients, useTeam } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { PortalStatusFilterOptions } from "@/config/constants/dropdowns/users/portal-status-filter.options";
import { ClientSortOptions, ClientStatusFilterOptions } from "@/config/constants/dropdowns/users/client-sort.options";
import { Routes } from "@/routes/routes";
import { formatDate } from "@/lib/format";
import { AssignDialog } from "@/pages/shared/components/assign-dialog";
import { ImportClientsDialog } from "./components/import-clients-dialog";
import { ReminderDialog } from "@/pages/shared/components/reminder-dialog";
import { useDebounced } from "@/hooks/use-debounced";

const ClientsPage: FC = () => {
  const { t } = useTranslation("clients");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { can, isOwnerOrAdmin } = useWorkspace();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debounced = useDebounced(search, 300);
  const [status, setStatus] = useState("ACTIVE");
  const [employee, setEmployee] = useState("all");
  const [portal, setPortal] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [assignFor, setAssignFor] = useState<{ id?: string; name?: string } | null>(params.get("assign") === "1" ? {} : null);
  const [remindFor, setRemindFor] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const team = useTeam();
  const clients = useClients({ search: debounced, status, employee_id: employee, portal, sort, page, limit: 25 });

  useEffect(() => setPage(1), [debounced, status, employee, portal, sort]);
  useEffect(() => {
    const q = params.get("search");
    if (q !== null) setSearch(q);
  }, [params]);

  const closeAssign = () => {
    setAssignFor(null);
    if (params.get("assign")) {
      params.delete("assign");
      setParams(params, { replace: true });
    }
  };

  const employeeOptions = [{ id: "all", label: t("list.allEmployees") }, ...(team.data?.members ?? []).map((m) => ({ id: m.member_id, label: m.name }))];
  const rows = clients.data?.data ?? [];
  const pg = clients.data?.pagination;

  return (
    <>
      <PageHeader
        title={t("list.title")}
        description={isOwnerOrAdmin ? t("list.descriptionAdmin") : t("list.descriptionMember")}
        actions={
          <>
            <Button variant="outline" onClick={() => setAssignFor({})}>
              <Send />
              {t("list.assignForm")}
            </Button>
            {can(Permissions.CLIENTS_CREATE) && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload />
                {t("import.button")}
              </Button>
            )}
            {can(Permissions.CLIENTS_CREATE) && (
              <Button onClick={() => navigate(Routes.clients.new)}>
                <Plus />
                {t("list.addClient")}
              </Button>
            )}
          </>
        }
      />
      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Search className="icon h-4 w-4" />
            <Input aria-label={t("list.searchLabel")} className="h-8 pl-9 text-[16px]" placeholder={t("list.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterSelect label={t("list.filters.status")} value={status} onChange={setStatus} options={ClientStatusFilterOptions} />
          <FilterSelect label={t("list.filters.employee")} value={employee} onChange={setEmployee} options={employeeOptions} />
          <FilterSelect label={t("list.filters.portal")} value={portal} onChange={setPortal} options={PortalStatusFilterOptions} />
          <FilterSelect label={t("list.filters.sort")} value={sort} onChange={setSort} options={ClientSortOptions} />
        </div>
        {clients.isPending ? (
          <TableSkeleton rows={8} />
        ) : clients.isError ? (
          <div className="callout bad m-4">{clients.error.message}</div>
        ) : !rows.length ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={debounced || employee !== "all" || portal !== "all" ? t("list.empty.noMatchTitle") : t("list.empty.noneTitle")}
            description={debounced ? t("list.empty.searchDescription") : t("list.empty.noneDescription")}
            action={
              can(Permissions.CLIENTS_CREATE) && !debounced ? (
                <Button onClick={() => navigate(Routes.clients.new)}>
                  <Plus />
                  {t("list.addClient")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <Table className="table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("list.columns.client")}</TableHead>
                  <TableHead>{t("list.columns.assignedTo")}</TableHead>
                  <TableHead>{t("list.columns.forms")}</TableHead>
                  <TableHead>{t("list.columns.attention")}</TableHead>
                  <TableHead>{t("list.columns.progress")}</TableHead>
                  <TableHead>{t("list.columns.portal")}</TableHead>
                  <TableHead>{t("list.columns.added")}</TableHead>
                  <TableHead className="actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} className="clickable" onClick={() => navigate(Routes.clients.detail(c.id))}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={`${c.first_name} ${c.last_name}`} />
                        <div className="min-w-0">
                          <Link to={Routes.clients.detail(c.id)} className="cell-main block truncate" onClick={(e) => e.stopPropagation()}>
                            {c.first_name} {c.last_name}
                          </Link>
                          <span className="cell-sub block truncate">{c.company ?? c.email ?? "—"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="avatars">
                        {c.assignees.slice(0, 3).map((a) => (
                          <span key={a.member_id} title={a.name}>
                            <InitialsAvatar name={a.name} size="sm" />
                          </span>
                        ))}
                        {!c.assignees.length && <span className="muted">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>{c.forms_count}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.requirements_missing > 0 && <StatusBadge tone="missing">{t("list.badges.missing", { count: c.requirements_missing })}</StatusBadge>}
                        {c.requirements_expired > 0 && <StatusBadge tone="expired">{t("list.badges.expired", { count: c.requirements_expired })}</StatusBadge>}
                        {c.overdue_count > 0 && <StatusBadge tone="rejected">{t("list.badges.overdue", { count: c.overdue_count })}</StatusBadge>}
                        {!c.requirements_missing && !c.requirements_expired && !c.overdue_count && <span className="muted">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>{c.requirements_total ? <ProgressCell percent={c.progress_percent} /> : <span className="muted">{t("list.noForms")}</span>}</TableCell>
                    <TableCell>{c.status === "ARCHIVED" ? <StatusBadge tone="notreq">{t("list.archived")}</StatusBadge> : <PortalStatusBadge status={c.portal_status} />}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(c.created_at)}</TableCell>
                    <TableCell className="actions" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label={t("list.actions.for", { name: `${c.first_name} ${c.last_name}` })}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(Routes.clients.detail(c.id))}>{t("list.actions.open")}</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setAssignFor({ id: c.id, name: `${c.first_name} ${c.last_name}` })}>{t("list.actions.assign")}</DropdownMenuItem>
                          <DropdownMenuItem disabled={!c.email} onSelect={() => setRemindFor(c.id)}>
                            {t("list.actions.remind")}
                          </DropdownMenuItem>
                          {can(Permissions.CLIENTS_MANAGE) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => navigate(Routes.clients.edit(c.id))}>{t("list.actions.edit")}</DropdownMenuItem>
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
        {pg && pg.total > 0 && (
          <div className="table-foot">
            <span>
              {t("list.pagination.range", { from: (pg.page - 1) * pg.limit + 1, to: Math.min(pg.page * pg.limit, pg.total), total: pg.total, count: pg.total })}
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!pg.has_prev} onClick={() => setPage((p) => p - 1)}>
                {t("list.pagination.previous")}
              </Button>
              <Button size="sm" variant="outline" disabled={!pg.has_next} onClick={() => setPage((p) => p + 1)}>
                {t("list.pagination.next")}
              </Button>
            </span>
          </div>
        )}
      </section>
      <AssignDialog open={!!assignFor} onOpenChange={(o) => !o && closeAssign()} clientId={assignFor?.id} clientName={assignFor?.name} />
      <ImportClientsDialog open={importOpen} onOpenChange={setImportOpen} />
      <ReminderDialog open={!!remindFor} onOpenChange={(o) => !o && setRemindFor(null)} clientId={remindFor} />
    </>
  );
};

export default ClientsPage;

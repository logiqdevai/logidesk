import type { Country } from "react-phone-number-input";
import { CountryFlag } from "@/components/ui/country-flag";
import { getClientCountryLabel } from "@/config/constants/dropdowns/client-country.options";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Archive, ArchiveRestore, Lock, MoreHorizontal, Pencil, Plus, Send, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { DetailSkeleton, EmptyState, FileIcon, InitialsAvatar, ProgressCell, SegmentedProgress, StatCard, TableSkeleton } from "@/components/ui/page-elements";
import { AssignmentStatusBadge, PortalStatusBadge, RequirementStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import {
  useAddNote,
  useArchiveClient,
  useDeleteClient,
  useClient,
  useClientActivity,
  useClientAssignments,
  useClientNotes,
  useDeleteNote,
  useInviteClientPortal,
  useSetAssignees,
  useTeam,
  useOrgTimeZone,
} from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import type { ClientRequirementItem } from "@/features/clients/interfaces/clients.interfaces";
import { getOrganizationRoleLabel } from "@/config/constants/dropdowns/users/organization-role-form.options";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate, formatDateTime, formatDeadline, formatRelative } from "@/lib/format";
import { ActivityTimeline } from "@/pages/shared/components/activity-timeline";
import { AssignDialog } from "@/pages/shared/components/assign-dialog";
import { UploadDialog } from "@/pages/shared/components/upload-dialog";
import { ReminderDialog } from "@/pages/shared/components/reminder-dialog";
import { DocumentsTable } from "@/pages/shared/components/documents-table";

const TABS = ["overview", "forms", "documents", "activity", "notes"] as const;

const AttentionRow: FC<{ item: ClientRequirementItem; kind: "missing" | "expired" | "expiring" | "review"; onUpload: () => void; onRemind: () => void }> = ({ item, kind, onUpload, onRemind }) => {
  const timeZone = useOrgTimeZone();
  const { t } = useTranslation("clients");
  const days = daysUntil(item.document?.expiration_date);
  const sub =
    kind === "expired"
      ? t("detail.attention.expired", { date: formatDate(item.document?.expiration_date), form: item.form_name })
      : kind === "expiring"
        ? `${t("detail.attention.expires", { date: formatDate(item.document?.expiration_date) })}${days !== null ? ` · ${t("detail.attention.inDays", { count: days })}` : ""}`
        : kind === "review"
          ? t("detail.attention.submitted", { date: formatDate(item.document?.uploaded_at), form: item.form_name })
          : `${item.status === "REJECTED" ? t("detail.attention.rejectedWaiting") : t("detail.attention.notSubmitted")} · ${item.form_name}${item.deadline ? ` · ${t("detail.attention.due", { date: formatDeadline(item.deadline, timeZone) })}` : ""}`;
  return (
    <div className="list-row">
      <FileIcon format={item.document?.file_format} />
      <div className="grow min-w-0">
        <Link to={Routes.assignments.detail(item.assignment_id)} className="cell-main block truncate">
          {item.name}
        </Link>
        <div className="cell-sub">{sub}</div>
      </div>
      <RequirementStatusBadge status={item.status} expiringSoon={kind === "expiring"} />
      {kind === "review" ? (
        <Button size="sm" asChild>
          <Link to={Routes.assignments.detail(item.assignment_id)}>{t("detail.attention.review")}</Link>
        </Button>
      ) : kind === "missing" ? (
        <Button size="sm" variant="outline" onClick={onUpload}>
          {t("detail.attention.upload")}
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={onRemind}>
          {t("detail.attention.remind")}
        </Button>
      )}
    </div>
  );
};

const ClientDetailPage: FC = () => {
  const timeZone = useOrgTimeZone();
  const { t } = useTranslation("clients");
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const { can } = useWorkspace();
  const client = useClient(id);
  const assignments = useClientAssignments(id);
  const activity = useClientActivity(tab === "activity" ? id : undefined);
  const notes = useClientNotes(tab === "notes" ? id : undefined);
  const team = useTeam();
  const archive = useArchiveClient();
  const deleteClient = useDeleteClient();
  const invite = useInviteClientPortal();
  const setAssignees = useSetAssignees();
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();
  const [assignOpen, setAssignOpen] = useState(false);
  const [upload, setUpload] = useState<{ assignmentId?: string; requirementId?: string } | null>(null);
  const [remindOpen, setRemindOpen] = useState<{ assignmentId?: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [note, setNote] = useState("");

  if (client.isPending) return <DetailSkeleton />;
  if (client.isError || !client.data) return <div className="callout bad">{client.error?.message ?? t("detail.notFound")}</div>;
  const c = client.data;
  const o = c.overview;
  const name = `${c.first_name} ${c.last_name}`;
  const setTab = (tabId: string) => setParams({ tab: tabId }, { replace: true });
  const activeAssignments = (assignments.data ?? []).filter((a) => !a.cancelled_at);

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={Routes.clients.root}>{t("list.title")}</Link>
        <span>›</span>
        <span>{name}</span>
      </nav>
      <div className="page-head">
        <div className="flex items-center gap-4">
          <InitialsAvatar name={name} size="lg" />
          <div>
            <h1>{name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-2">
              {c.company && <StatusBadge tone="plain">{c.company}</StatusBadge>}
              {c.status === "ARCHIVED" ? <StatusBadge tone="notreq">{t("list.archived")}</StatusBadge> : <PortalStatusBadge status={c.portal.status} />}
              <span className="muted">{t("detail.clientSince", { date: formatDate(c.created_at) })}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can(Permissions.DOCUMENTS_UPLOAD) && (
            <Button variant="outline" onClick={() => setUpload({})} disabled={!activeAssignments.length}>
              <Upload />
              {t("detail.uploadForClient")}
            </Button>
          )}
          <Button variant="outline" onClick={() => setRemindOpen({})} disabled={!c.email}>
            <Send />
            {t("list.actions.remind")}
          </Button>
          <Button onClick={() => setAssignOpen(true)} disabled={c.status === "ARCHIVED"}>
            <Plus />
            {t("detail.assignForm")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label={t("detail.moreActions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {can(Permissions.CLIENTS_MANAGE) && (
                <DropdownMenuItem onSelect={() => navigate(Routes.clients.edit(c.id))}>
                  <Pencil className="h-4 w-4" />
                  {t("list.actions.edit")}
                </DropdownMenuItem>
              )}
              {can(Permissions.CLIENTS_ARCHIVE) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setArchiving(true)}>
                    {c.status === "ARCHIVED" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {c.status === "ARCHIVED" ? t("detail.restoreClient") : t("detail.archiveClient")}
                  </DropdownMenuItem>
                </>
              )}
              {can(Permissions.CLIENTS_DELETE) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onSelect={() => setDeleting(true)}>
                    <Trash2 className="h-4 w-4" />
                    {t("detail.deleteClient")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((id) => (
          <button key={id} role="tab" aria-selected={tab === id} className={cn("tab", tab === id && "active")} onClick={() => setTab(id)}>
            {t(`detail.tabs.${id}`)}
            {id === "forms" && <span className="n">{activeAssignments.length}</span>}
            {id === "documents" && <span className="n">{o.total}</span>}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="gr main-side">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="card pad">
              <div className="flex items-center justify-between">
                <h3>{t("detail.progress.title")}</h3>
                <span className="num text-[32px]">{o.progress_percent}%</span>
              </div>
              {o.total ? (
                <>
                  <SegmentedProgress large className="mt-4" total={o.total} ok={o.approved} review={o.under_review} bad={o.expired + o.rejected} />
                  <div className="legend mt-4">
                    <span><i style={{ background: "var(--g-success)" }} />{t("detail.progress.approved", { count: o.approved })}</span>
                    <span><i style={{ background: "var(--g-amber)" }} />{t("detail.progress.awaitingReview", { count: o.under_review })}</span>
                    <span><i style={{ background: "var(--g-surface-cream-strong)" }} />{t("detail.progress.missing", { count: o.missing })}</span>
                    <span><i style={{ background: "var(--g-error)" }} />{t("detail.progress.expiredRejected", { expired: o.expired, rejected: o.rejected })}</span>
                  </div>
                </>
              ) : (
                <p className="muted mt-2">{t("detail.progress.noForms")}</p>
              )}
            </div>
            <div className="gr c3">
              <StatCard label={t("detail.stats.missing")} value={o.missing + o.rejected} tone={o.missing + o.rejected ? "alert" : undefined} sub={o.missing_items.slice(0, 2).map((i) => i.name).join(", ") || t("detail.stats.nothingMissing")} />
              <StatCard label={t("detail.stats.expired")} value={o.expired} tone={o.expired ? "alert" : undefined} sub={o.expired_items[0]?.name ?? t("detail.stats.none")} />
              <StatCard label={t("detail.stats.expiringSoon")} value={o.expiring_soon} tone={o.expiring_soon ? "warn" : undefined} sub={o.expiring_items[0] ? `${o.expiring_items[0].name} · ${formatDate(o.expiring_items[0].document?.expiration_date)}` : t("detail.stats.next30Days")} />
            </div>
            <section className="card">
              <div className="card-head">
                <h3>{t("detail.needsAttention")}</h3>
              </div>
              {[...o.expired_items, ...o.missing_items, ...o.expiring_items, ...o.review_items].length === 0 ? (
                <EmptyState title={t("detail.allCaughtUp.title")} description={t("detail.allCaughtUp.description")} />
              ) : (
                <>
                  {o.expired_items.map((i) => (
                    <AttentionRow key={i.assignment_requirement_id} item={i} kind="expired" onUpload={() => setUpload({ assignmentId: i.assignment_id, requirementId: i.assignment_requirement_id })} onRemind={() => setRemindOpen({ assignmentId: i.assignment_id })} />
                  ))}
                  {o.missing_items.map((i) => (
                    <AttentionRow key={i.assignment_requirement_id} item={i} kind="missing" onUpload={() => setUpload({ assignmentId: i.assignment_id, requirementId: i.assignment_requirement_id })} onRemind={() => setRemindOpen({ assignmentId: i.assignment_id })} />
                  ))}
                  {o.expiring_items.map((i) => (
                    <AttentionRow key={i.assignment_requirement_id} item={i} kind="expiring" onUpload={() => setUpload({ assignmentId: i.assignment_id, requirementId: i.assignment_requirement_id })} onRemind={() => setRemindOpen({ assignmentId: i.assignment_id })} />
                  ))}
                  {o.review_items.map((i) => (
                    <AttentionRow key={i.assignment_requirement_id} item={i} kind="review" onUpload={() => undefined} onRemind={() => undefined} />
                  ))}
                </>
              )}
            </section>
            <section className="card">
              <div className="card-head">
                <h3>{t("detail.recentlySubmitted")}</h3>
              </div>
              {o.recent_documents.length === 0 ? (
                <p className="muted px-5 py-4">{t("detail.noDocuments")}</p>
              ) : (
                o.recent_documents.map((d) => (
                  <div key={d.id} className="list-row">
                    <FileIcon format={d.file_format} />
                    <div className="grow min-w-0">
                      <div className="cell-main truncate">{d.title}</div>
                      <div className="cell-sub truncate">
                        {d.original_filename} · {formatRelative(d.uploaded_at)}
                        {d.form_name ? ` · ${d.form_name}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
          <aside className="flex flex-col gap-4">
            <div className="card pad">
              <h3 className="mb-4">{t("detail.info.title")}</h3>
              <dl className="kv">
                <dt>{t("form.fields.firstName")}</dt>
                <dd>{c.first_name}</dd>
                <dt>{t("form.fields.lastName")}</dt>
                <dd>{c.last_name}</dd>
                <dt>{t("form.fields.company")}</dt>
                <dd>{c.company ?? "—"}</dd>
                <dt>{t("form.fields.email")}</dt>
                <dd className="[overflow-wrap:anywhere]">{c.email ?? "—"}</dd>
                <dt>{t("form.fields.phone")}</dt>
                <dd>{c.phone ?? "—"}</dd>
                <dt>{t("detail.info.taxId")}</dt>
                <dd>{c.tax_id ?? "—"}</dd>
                <dt>{t("form.fields.country")}</dt>
                <dd>
                  {c.country ? (
                    <span className="inline-flex items-center gap-2">
                      <CountryFlag country={c.country as Country} />
                      {getClientCountryLabel(c.country)}
                    </span>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt>{t("form.fields.address")}</dt>
                <dd>{c.address ?? "—"}</dd>
                <dt>{t("detail.info.companyNotes")}</dt>
                <dd className="whitespace-pre-line">{c.company_info ?? "—"}</dd>
              </dl>
              <div className="divider" />
              <div className="flex items-center justify-between">
                <span className="label">{t("form.assignedEmployees")}</span>
                {can(Permissions.CLIENTS_ASSIGN_EMPLOYEES) && (
                  <button
                    className="link-btn"
                    onClick={() => {
                      setMemberIds(c.assignees.map((a) => a.member_id));
                      setEmployeesOpen(true);
                    }}
                  >
                    {t("detail.manage")}
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {c.assignees.length ? (
                  c.assignees.map((a) => (
                    <div key={a.member_id} className="flex items-center gap-2">
                      <InitialsAvatar name={a.name} size="sm" />
                      {a.name}
                    </div>
                  ))
                ) : (
                  <span className="muted">{t("detail.noAssignees")}</span>
                )}
              </div>
            </div>
            <div className="card pad">
              <h3>{t("detail.portal.title")}</h3>
              <p className="muted mt-2">
                {c.portal.status === "active"
                  ? t("detail.portal.active", { when: c.portal.last_login_at ? formatDateTime(c.portal.last_login_at) : t("detail.portal.never") })
                  : c.portal.status === "invited"
                    ? t("detail.portal.invited", { when: c.portal.invited_at ? formatRelative(c.portal.invited_at) : "", email: c.portal.email ?? c.email })
                    : c.email
                      ? t("detail.portal.notInvited")
                      : t("detail.portal.noEmail")}
              </p>
              {c.portal.status !== "active" && can(Permissions.CLIENTS_MANAGE) && (
                <Button size="sm" variant="outline" className="mt-4" disabled={!c.email} loading={invite.isPending} onClick={() => invite.mutate(c.id)}>
                  {c.portal.status === "invited" ? t("detail.portal.resend") : t("detail.portal.send")}
                </Button>
              )}
            </div>
          </aside>
        </div>
      )}

      {tab === "forms" && (
        <section className="card">
          {assignments.isPending ? (
            <TableSkeleton rows={3} />
          ) : !assignments.data?.length ? (
            <EmptyState
              title={t("detail.forms.emptyTitle")}
              description={t("detail.forms.emptyDescription")}
              action={
                <Button onClick={() => setAssignOpen(true)}>
                  <Plus />
                  {t("detail.assignForm")}
                </Button>
              }
            />
          ) : (
            <div className="table-wrap">
              <Table className="table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("detail.forms.columns.form")}</TableHead>
                    <TableHead>{t("detail.forms.columns.assigned")}</TableHead>
                    <TableHead>{t("detail.forms.columns.deadline")}</TableHead>
                    <TableHead>{t("detail.forms.columns.completion")}</TableHead>
                    <TableHead>{t("detail.forms.columns.missing")}</TableHead>
                    <TableHead>{t("detail.forms.columns.expired")}</TableHead>
                    <TableHead>{t("detail.forms.columns.status")}</TableHead>
                    <TableHead className="actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.data.map((a) => (
                    <TableRow key={a.id} className="clickable" onClick={() => navigate(Routes.assignments.detail(a.id))}>
                      <TableCell className="cell-main">{a.form_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(a.assigned_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDeadline(a.deadline, timeZone)}</TableCell>
                      <TableCell>
                        <ProgressCell percent={a.progress_percent} />
                      </TableCell>
                      <TableCell>{a.requirements_missing}</TableCell>
                      <TableCell>{a.requirements_expired}</TableCell>
                      <TableCell>
                        <AssignmentStatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="actions" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" asChild>
                            <Link to={Routes.assignments.detail(a.id)}>{t("detail.forms.viewForm")}</Link>
                          </Button>
                          {!a.cancelled_at && can(Permissions.DOCUMENTS_UPLOAD) && (
                            <Button size="sm" variant="outline" onClick={() => setUpload({ assignmentId: a.id })}>
                              {t("detail.attention.upload")}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}

      {tab === "documents" && <DocumentsTable clientId={c.id} />}

      {tab === "activity" && (
        <section className="card pad">{activity.isPending ? <TableSkeleton rows={5} className="p-0" /> : <ActivityTimeline items={activity.data ?? []} showClient={false} />}</section>
      )}

      {tab === "notes" && (
        <section className="card pad flex flex-col gap-3">
          <p className="muted flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> {t("detail.notes.internalOnly")}
          </p>
          {notes.isPending ? (
            <TableSkeleton rows={2} className="p-0" />
          ) : (
            notes.data?.map((n) => (
              <div key={n.id} className="callout">
                <div className="grow">
                  <div className="cell-sub">
                    {n.author_name} · {formatDateTime(n.created_at)}
                  </div>
                  <div className="whitespace-pre-line">{n.body}</div>
                </div>
                {n.can_delete && (
                  <Button size="icon" variant="ghost" aria-label={t("detail.notes.delete")} onClick={() => deleteNote.mutate({ id: c.id, noteId: n.id })}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))
          )}
          <div className="field">
            <label htmlFor="note" className="label">
              {t("detail.notes.add")}
            </label>
            <Textarea id="note" rows={3} placeholder={t("detail.notes.placeholder")} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div>
            <Button loading={addNote.isPending} disabled={!note.trim()} onClick={() => addNote.mutate({ id: c.id, body: note.trim() }, { onSuccess: () => setNote("") })}>
              {t("detail.notes.save")}
            </Button>
          </div>
        </section>
      )}

      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} clientId={c.id} clientName={name} />
      <UploadDialog open={!!upload} onOpenChange={(o) => !o && setUpload(null)} clientId={c.id} clientName={c.first_name} assignmentId={upload?.assignmentId} requirementId={upload?.requirementId} />
      <ReminderDialog open={!!remindOpen} onOpenChange={(o) => !o && setRemindOpen(null)} clientId={c.id} assignmentId={remindOpen?.assignmentId} />
      <ConfirmationDialog
        isOpen={archiving}
        onClose={() => setArchiving(false)}
        variant={c.status === "ARCHIVED" ? "default" : "destructive"}
        title={c.status === "ARCHIVED" ? t("detail.archive.restoreTitle") : t("detail.archive.archiveTitle")}
        description={
          c.status === "ARCHIVED"
            ? t("detail.archive.restoreDescription")
            : t("detail.archive.archiveDescription")
        }
        confirmText={c.status === "ARCHIVED" ? t("detail.archive.restore") : t("detail.archive.archive")}
        isLoading={archive.isPending}
        onConfirm={() => archive.mutate({ id: c.id, archived: c.status !== "ARCHIVED" }, { onSuccess: () => setArchiving(false) })}
      />
      <ConfirmationDialog
        isOpen={deleting}
        onClose={() => setDeleting(false)}
        variant="destructive"
        title={t("detail.delete.title")}
        description={t("detail.delete.description")}
        confirmText={t("detail.delete.confirm")}
        isLoading={deleteClient.isPending}
        onConfirm={() => deleteClient.mutate(c.id, { onSuccess: () => navigate(Routes.clients.root) })}
      />
      <Dialog open={employeesOpen} onOpenChange={(o) => !setAssignees.isPending && setEmployeesOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[26px] font-medium">{t("form.assignedEmployees")}</DialogTitle>
            <DialogDescription>{t("detail.employeesDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="card max-h-80 overflow-y-auto">
            {(team.data?.members ?? []).map((m) => (
              <label key={m.member_id} className="list-row cursor-pointer !py-2.5">
                <Checkbox checked={memberIds.includes(m.member_id)} onCheckedChange={(v) => setMemberIds((ids) => (v ? [...ids, m.member_id] : ids.filter((x) => x !== m.member_id)))} aria-label={m.name} />
                <span className="grow">
                  <span className="cell-main block">{m.name}</span>
                  <span className="cell-sub">{getOrganizationRoleLabel(m.role)}</span>
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployeesOpen(false)}>
              {t("form.cancel")}
            </Button>
            <Button loading={setAssignees.isPending} disabled={!memberIds.length} onClick={() => setAssignees.mutate({ id: c.id, member_ids: memberIds }, { onSuccess: () => setEmployeesOpen(false) })}>
              {t("detail.employeesDialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientDetailPage;

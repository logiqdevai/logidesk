import { useState, type FC } from "react";
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
  useClient,
  useClientActivity,
  useClientAssignments,
  useClientNotes,
  useDeleteNote,
  useInviteClientPortal,
  useSetAssignees,
  useTeam,
} from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import type { ClientRequirementItem } from "@/features/clients/interfaces/clients.interfaces";
import { getOrganizationRoleLabel } from "@/config/constants/dropdowns/users/organization-role-form.options";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { ActivityTimeline } from "@/pages/shared/components/activity-timeline";
import { AssignDialog } from "@/pages/shared/components/assign-dialog";
import { UploadDialog } from "@/pages/shared/components/upload-dialog";
import { ReminderDialog } from "@/pages/shared/components/reminder-dialog";
import { DocumentsTable } from "@/pages/shared/components/documents-table";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "forms", label: "Assigned Forms" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity" },
  { id: "notes", label: "Notes" },
];

const AttentionRow: FC<{ item: ClientRequirementItem; kind: "missing" | "expired" | "expiring" | "review"; onUpload: () => void; onRemind: () => void }> = ({ item, kind, onUpload, onRemind }) => {
  const days = daysUntil(item.document?.expiration_date);
  const sub =
    kind === "expired"
      ? `Expired ${formatDate(item.document?.expiration_date)} · ${item.form_name}`
      : kind === "expiring"
        ? `Expires ${formatDate(item.document?.expiration_date)}${days !== null ? ` · in ${days} days` : ""}`
        : kind === "review"
          ? `Submitted ${formatDate(item.document?.uploaded_at)} · ${item.form_name}`
          : `${item.status === "REJECTED" ? "Rejected — waiting for a new upload" : "Not yet submitted"} · ${item.form_name}${item.deadline ? ` · due ${formatDate(item.deadline)}` : ""}`;
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
          <Link to={Routes.assignments.detail(item.assignment_id)}>Review</Link>
        </Button>
      ) : kind === "missing" ? (
        <Button size="sm" variant="outline" onClick={onUpload}>
          Upload
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={onRemind}>
          Remind
        </Button>
      )}
    </div>
  );
};

const ClientDetailPage: FC = () => {
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
  const invite = useInviteClientPortal();
  const setAssignees = useSetAssignees();
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();
  const [assignOpen, setAssignOpen] = useState(false);
  const [upload, setUpload] = useState<{ assignmentId?: string; requirementId?: string } | null>(null);
  const [remindOpen, setRemindOpen] = useState<{ assignmentId?: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [note, setNote] = useState("");

  if (client.isPending) return <DetailSkeleton />;
  if (client.isError || !client.data) return <div className="callout bad">{client.error?.message ?? "Client not found"}</div>;
  const c = client.data;
  const o = c.overview;
  const name = `${c.first_name} ${c.last_name}`;
  const setTab = (t: string) => setParams({ tab: t }, { replace: true });
  const activeAssignments = (assignments.data ?? []).filter((a) => !a.cancelled_at);

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={Routes.clients.root}>Clients</Link>
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
              {c.status === "ARCHIVED" ? <StatusBadge tone="notreq">Archived</StatusBadge> : <PortalStatusBadge status={c.portal.status} />}
              <span className="muted">Client since {formatDate(c.created_at)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can(Permissions.DOCUMENTS_UPLOAD) && (
            <Button variant="outline" onClick={() => setUpload({})} disabled={!activeAssignments.length}>
              <Upload />
              Upload for client
            </Button>
          )}
          <Button variant="outline" onClick={() => setRemindOpen({})} disabled={!c.email}>
            <Send />
            Send reminder
          </Button>
          <Button onClick={() => setAssignOpen(true)} disabled={c.status === "ARCHIVED"}>
            <Plus />
            Assign form
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {can(Permissions.CLIENTS_MANAGE) && (
                <DropdownMenuItem onSelect={() => navigate(Routes.clients.edit(c.id))}>
                  <Pencil className="h-4 w-4" />
                  Edit details
                </DropdownMenuItem>
              )}
              {can(Permissions.CLIENTS_ARCHIVE) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setArchiving(true)}>
                    {c.status === "ARCHIVED" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {c.status === "ARCHIVED" ? "Restore client" : "Archive client"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={cn("tab", tab === t.id && "active")} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === "forms" && <span className="n">{activeAssignments.length}</span>}
            {t.id === "documents" && <span className="n">{o.total}</span>}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="gr main-side">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="card pad">
              <div className="flex items-center justify-between">
                <h3>Overall collection progress</h3>
                <span className="num text-[32px]">{o.progress_percent}%</span>
              </div>
              {o.total ? (
                <>
                  <SegmentedProgress large className="mt-4" total={o.total} ok={o.approved} review={o.under_review} bad={o.expired + o.rejected} />
                  <div className="legend mt-4">
                    <span><i style={{ background: "var(--g-success)" }} />{o.approved} approved</span>
                    <span><i style={{ background: "var(--g-amber)" }} />{o.under_review} awaiting review</span>
                    <span><i style={{ background: "var(--g-surface-cream-strong)" }} />{o.missing} missing</span>
                    <span><i style={{ background: "var(--g-error)" }} />{o.expired} expired · {o.rejected} rejected</span>
                  </div>
                </>
              ) : (
                <p className="muted mt-2">No forms assigned yet. Assign a form to start collecting documents.</p>
              )}
            </div>
            <div className="gr c3">
              <StatCard label="Missing" value={o.missing + o.rejected} tone={o.missing + o.rejected ? "alert" : undefined} sub={o.missing_items.slice(0, 2).map((i) => i.name).join(", ") || "Nothing missing"} />
              <StatCard label="Expired" value={o.expired} tone={o.expired ? "alert" : undefined} sub={o.expired_items[0]?.name ?? "None"} />
              <StatCard label="Expiring soon" value={o.expiring_soon} tone={o.expiring_soon ? "warn" : undefined} sub={o.expiring_items[0] ? `${o.expiring_items[0].name} · ${formatDate(o.expiring_items[0].document?.expiration_date)}` : "Next 30 days"} />
            </div>
            <section className="card">
              <div className="card-head">
                <h3>Needs attention</h3>
              </div>
              {[...o.expired_items, ...o.missing_items, ...o.expiring_items, ...o.review_items].length === 0 ? (
                <EmptyState title="All caught up" description="No missing, expired or pending documents for this client." />
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
                <h3>Recently submitted</h3>
              </div>
              {o.recent_documents.length === 0 ? (
                <p className="muted px-5 py-4">No documents uploaded yet.</p>
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
              <h3 className="mb-4">Client information</h3>
              <dl className="kv">
                <dt>First name</dt>
                <dd>{c.first_name}</dd>
                <dt>Last name</dt>
                <dd>{c.last_name}</dd>
                <dt>Company</dt>
                <dd>{c.company ?? "—"}</dd>
                <dt>Email</dt>
                <dd className="[overflow-wrap:anywhere]">{c.email ?? "—"}</dd>
                <dt>Phone</dt>
                <dd>{c.phone ?? "—"}</dd>
                <dt>Tax ID</dt>
                <dd>{c.tax_id ?? "—"}</dd>
                <dt>Address</dt>
                <dd>{c.address ?? "—"}</dd>
                <dt>Company notes</dt>
                <dd className="whitespace-pre-line">{c.company_info ?? "—"}</dd>
              </dl>
              <div className="divider" />
              <div className="flex items-center justify-between">
                <span className="label">Assigned employees</span>
                {can(Permissions.CLIENTS_ASSIGN_EMPLOYEES) && (
                  <button
                    className="link-btn"
                    onClick={() => {
                      setMemberIds(c.assignees.map((a) => a.member_id));
                      setEmployeesOpen(true);
                    }}
                  >
                    Manage
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
                  <span className="muted">No one assigned (Owners and Admins can see this client)</span>
                )}
              </div>
            </div>
            <div className="card pad">
              <h3>Client portal</h3>
              <p className="muted mt-2">
                {c.portal.status === "active"
                  ? `Active · last login ${c.portal.last_login_at ? formatDateTime(c.portal.last_login_at) : "never"}`
                  : c.portal.status === "invited"
                    ? `Invitation sent ${c.portal.invited_at ? formatRelative(c.portal.invited_at) : ""} to ${c.portal.email ?? c.email}`
                    : c.email
                      ? "Not invited yet. The client is invited automatically when you assign their first form."
                      : "Add an email address to invite this client to the portal."}
              </p>
              {c.portal.status !== "active" && can(Permissions.CLIENTS_MANAGE) && (
                <Button size="sm" variant="outline" className="mt-4" disabled={!c.email} loading={invite.isPending} onClick={() => invite.mutate(c.id)}>
                  {c.portal.status === "invited" ? "Resend invitation" : "Send invitation"}
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
              title="No forms assigned"
              description="Assign a document form to start collecting from this client."
              action={
                <Button onClick={() => setAssignOpen(true)}>
                  <Plus />
                  Assign form
                </Button>
              }
            />
          ) : (
            <div className="table-wrap">
              <Table className="table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Missing</TableHead>
                    <TableHead>Expired</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.data.map((a) => (
                    <TableRow key={a.id} className="clickable" onClick={() => navigate(Routes.assignments.detail(a.id))}>
                      <TableCell className="cell-main">{a.form_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(a.assigned_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(a.deadline)}</TableCell>
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
                            <Link to={Routes.assignments.detail(a.id)}>View form</Link>
                          </Button>
                          {!a.cancelled_at && can(Permissions.DOCUMENTS_UPLOAD) && (
                            <Button size="sm" variant="outline" onClick={() => setUpload({ assignmentId: a.id })}>
                              Upload
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
            <Lock className="h-3.5 w-3.5" /> Internal notes are only visible to your team.
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
                  <Button size="icon" variant="ghost" aria-label="Delete note" onClick={() => deleteNote.mutate({ id: c.id, noteId: n.id })}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))
          )}
          <div className="field">
            <label htmlFor="note" className="label">
              Add a note
            </label>
            <Textarea id="note" rows={3} placeholder="Write an internal note…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div>
            <Button loading={addNote.isPending} disabled={!note.trim()} onClick={() => addNote.mutate({ id: c.id, body: note.trim() }, { onSuccess: () => setNote("") })}>
              Save note
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
        title={c.status === "ARCHIVED" ? "Restore this client?" : "Archive this client?"}
        description={
          c.status === "ARCHIVED"
            ? "The client becomes active again and automatic reminders resume."
            : "Archived clients are hidden from lists and stop receiving automatic reminders. Their documents and history are kept."
        }
        confirmText={c.status === "ARCHIVED" ? "Restore" : "Archive"}
        isLoading={archive.isPending}
        onConfirm={() => archive.mutate({ id: c.id, archived: c.status !== "ARCHIVED" }, { onSuccess: () => setArchiving(false) })}
      />
      <Dialog open={employeesOpen} onOpenChange={(o) => !setAssignees.isPending && setEmployeesOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[26px] font-medium">Assigned employees</DialogTitle>
            <DialogDescription>Every selected employee can see and work with this client.</DialogDescription>
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
              Cancel
            </Button>
            <Button loading={setAssignees.isPending} disabled={!memberIds.length} onClick={() => setAssignees.mutate({ id: c.id, member_ids: memberIds }, { onSuccess: () => setEmployeesOpen(false) })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientDetailPage;

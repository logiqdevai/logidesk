import { useState, type FC } from "react";
import { Link } from "react-router-dom";
import { Bell, Plus, RotateCcw, Search, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/ui/page-elements";
import { NotificationStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useNotification,
  useNotifications,
  useRetryNotification,
  useTemplates,
  useUpdateTemplate,
} from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import type { NotificationTemplate, NotificationType } from "@/features/notifications/interfaces/notifications.interfaces";
import { NotificationStatusFilterOptions } from "@/config/constants/dropdowns/notifications/notification-status-filter.options";
import { NotificationTypeFilterOptions } from "@/config/constants/dropdowns/notifications/notification-type-filter.options";
import { NotificationTypeFormOptions, getNotificationTypeLabel } from "@/config/constants/dropdowns/notifications/notification-type-form.options";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounced";

const NotificationSheet: FC<{ id: string | null; onClose: () => void }> = ({ id, onClose }) => {
  const n = useNotification(id);
  const retry = useRetryNotification();
  const { can } = useWorkspace();
  const d = n.data;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="display text-[24px] font-medium">{d?.subject ?? "Notification"}</SheetTitle>
          <SheetDescription>{d ? `${getNotificationTypeLabel(d.type)} · ${d.trigger === "MANUAL" ? "manual" : "automatic"}` : " "}</SheetDescription>
        </SheetHeader>
        {!d ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-48" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-4 pb-6">
            <div className="flex items-center gap-2">
              <NotificationStatusBadge status={d.status} />
              {(d.status === "FAILED" || d.status === "CANCELLED") && can(Permissions.REMINDERS_SEND) && (
                <Button size="sm" variant="outline" loading={retry.isPending} onClick={() => retry.mutate(d.id)}>
                  <RotateCcw />
                  Retry
                </Button>
              )}
            </div>
            <dl className="kv">
              <dt>Recipient</dt>
              <dd>
                {d.recipient_name ? `${d.recipient_name} · ` : ""}
                {d.recipient_address}
              </dd>
              <dt>Channel</dt>
              <dd>Email</dd>
              <dt>Client</dt>
              <dd>{d.client ? <Link to={Routes.clients.detail(d.client.id)}>{d.client.name}</Link> : "—"}</dd>
              <dt>Assignment</dt>
              <dd>{d.assignment ? <Link to={Routes.assignments.detail(d.assignment.id)}>{d.assignment.form_name}</Link> : "—"}</dd>
              <dt>Created</dt>
              <dd>{formatDateTime(d.created_at)}</dd>
              {d.scheduled_for && (
                <>
                  <dt>Scheduled for</dt>
                  <dd>{formatDateTime(d.scheduled_for)} (quiet hours)</dd>
                </>
              )}
              <dt>Sent</dt>
              <dd>{formatDateTime(d.sent_at)}</dd>
              <dt>Provider</dt>
              <dd>
                {d.provider ?? "—"}
                {d.provider_message_id ? <span className="mono"> · {d.provider_message_id}</span> : ""}
              </dd>
              {d.failure_reason && (
                <>
                  <dt>Failure reason</dt>
                  <dd className="text-[var(--g-error-ink)]">{d.failure_reason}</dd>
                </>
              )}
              {d.sent_by && (
                <>
                  <dt>Sent by</dt>
                  <dd>{d.sent_by}</dd>
                </>
              )}
            </dl>
            <div>
              <span className="label">Message</span>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border bg-[var(--g-surface-soft)] p-4 font-sans text-[13.5px]">{d.body}</pre>
            </div>
            <div>
              <span className="label">Delivery attempts</span>
              <ul className="timeline mt-2">
                {d.jobs.map((j) => (
                  <li key={j.id}>
                    <span className={cn("ico", j.status === "COMPLETED" ? "ok" : j.status === "FAILED" || j.status === "RETRYING" ? "bad" : "")}>{j.attempt}</span>
                    <div>
                      <div>
                        <b className="ink">{j.status.toLowerCase()}</b> · attempt {j.attempt} of {j.max_attempts} · {j.trigger.toLowerCase().replace("_", " ")}
                      </div>
                      <div className="when">
                        queued {formatDateTime(j.queued_at)}
                        {j.duration_ms !== null ? ` · ${j.duration_ms} ms` : ""}
                        {j.worker_id ? ` · ${j.worker_id}` : ""}
                      </div>
                      {j.error_message && <div className="text-[12.5px] text-[var(--g-error-ink)]">{j.error_message}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const TemplateDialog: FC<{ template: NotificationTemplate | "new" | null; variables: string[]; onClose: () => void }> = ({ template, variables, onClose }) => {
  const editing = template && template !== "new" ? template : null;
  const [type, setType] = useState<NotificationType>(editing?.type ?? "MISSING_DOCUMENTS");
  const [name, setName] = useState(editing?.name ?? "");
  const [subject, setSubject] = useState(editing?.subject ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [isDefault, setIsDefault] = useState(editing?.is_default ?? false);
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const pending = create.isPending || update.isPending;
  const submit = () => {
    const dto = { type, name, subject, body, is_default: isDefault };
    if (editing) update.mutate({ id: editing.id, ...dto }, { onSuccess: onClose });
    else create.mutate(dto, { onSuccess: onClose });
  };
  return (
    <Dialog open={!!template} onOpenChange={(o) => !pending && !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="display text-[26px] font-medium">{editing ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>Use variables to personalize each message.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="t-name">Name</Label>
              <Input id="t-name" placeholder="e.g. Friendly reminder" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <Label>Used for</Label>
              <FilterSelect label="Template type" size="default" className="w-full" value={type} onChange={(v) => setType(v as NotificationType)} options={NotificationTypeFormOptions.filter((o) => !["EMAIL_VERIFICATION", "PASSWORD_RESET", "CUSTOM"].includes(o.id))} />
            </div>
          </div>
          <div className="field">
            <Label htmlFor="t-subject">Subject</Label>
            <Input id="t-subject" placeholder={"e.g. Documents still needed by {{company_name}}"} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field">
            <Label htmlFor="t-body">Message</Label>
            <Textarea id="t-body" placeholder={"Write your message. Use variables like {{client_name}}."} rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="chips mt-1">
              {variables.map((v) => (
                <button key={v} type="button" className="chip hover:bg-[var(--g-surface-cream-strong)]" onClick={() => setBody((b) => `${b}{{${v}}}`)}>
                  <code className="var">{`{{${v}}}`}</code>
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="label">Use by default for this type</span>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button loading={pending} disabled={!name.trim() || !body.trim()} onClick={submit}>
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const NotificationsPage: FC = () => {
  const { can } = useWorkspace();
  const [tab, setTab] = useState<"history" | "templates">("history");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<NotificationTemplate | "new" | null>(null);
  const [deleting, setDeleting] = useState<NotificationTemplate | null>(null);
  const history = useNotifications({ status, type, search: debounced, page, limit: 25 });
  const templates = useTemplates();
  const retry = useRetryNotification();
  const remove = useDeleteTemplate();
  const manage = can(Permissions.NOTIFICATIONS_MANAGE);
  const counts = history.data?.counts ?? {};
  const pg = history.data?.pagination;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Every email sent to clients and your team, with its delivery status."
        actions={
          manage && (
            <Button variant="outline" asChild>
              <Link to={Routes.settings.tab("notifications")}>
                <Settings />
                Notification settings
              </Link>
            </Button>
          )
        }
      />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "history"} className={cn("tab", tab === "history" && "active")} onClick={() => setTab("history")}>
          History
        </button>
        <button role="tab" aria-selected={tab === "templates"} className={cn("tab", tab === "templates" && "active")} onClick={() => setTab("templates")}>
          Templates <span className="n">{templates.data?.data.length ?? 0}</span>
        </button>
      </div>

      {tab === "history" ? (
        <section className="card">
          <div className="toolbar">
            <div className="search">
              <Search className="icon h-4 w-4" />
              <Input aria-label="Search notifications" className="h-8 pl-9 text-[13px]" placeholder="Search recipient or subject" value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} />
            </div>
            <FilterSelect label="Status" value={status} onChange={(v) => (setStatus(v), setPage(1))} options={NotificationStatusFilterOptions.map((o) => ({ ...o, label: o.id !== "all" && counts[o.id] ? `${o.label} (${counts[o.id]})` : o.label }))} />
            <FilterSelect label="Type" value={type} onChange={(v) => (setType(v), setPage(1))} options={NotificationTypeFilterOptions} />
          </div>
          {history.isPending ? (
            <TableSkeleton rows={8} />
          ) : !history.data?.data.length ? (
            <EmptyState icon={<Bell className="h-5 w-5" />} title="No notifications yet" description="Assignment emails, reminders and review updates appear here." />
          ) : (
            <div className="table-wrap">
              <Table className="table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.data.map((n) => (
                    <TableRow key={n.id} className="clickable" onClick={() => setOpenId(n.id)}>
                      <TableCell>
                        <div className="cell-main">{n.recipient_name ?? n.recipient_address}</div>
                        <div className="cell-sub">{n.client?.name ?? n.recipient_address}</div>
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <div className="truncate">{n.subject}</div>
                        {n.failure_reason && <div className="cell-sub truncate text-[var(--g-error-ink)]">{n.failure_reason}</div>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone="plain">{getNotificationTypeLabel(n.type)}</StatusBadge>
                        <div className="cell-sub">{n.trigger === "MANUAL" ? `Manual${n.sent_by ? ` · ${n.sent_by}` : ""}` : "Automatic"}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(n.created_at)}</TableCell>
                      <TableCell>
                        <NotificationStatusBadge status={n.status} />
                      </TableCell>
                      <TableCell className="actions" onClick={(e) => e.stopPropagation()}>
                        {n.status === "FAILED" && can(Permissions.REMINDERS_SEND) && (
                          <Button size="sm" variant="outline" loading={retry.isPending && retry.variables === n.id} onClick={() => retry.mutate(n.id)}>
                            <RotateCcw />
                            Retry
                          </Button>
                        )}
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
                {(pg.page - 1) * pg.limit + 1}–{Math.min(pg.page * pg.limit, pg.total)} of {pg.total}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!pg.has_prev} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={!pg.has_next} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </span>
            </div>
          )}
        </section>
      ) : (
        <section className="card">
          <div className="card-head">
            <h3>Message templates</h3>
            {manage && (
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus />
                New template
              </Button>
            )}
          </div>
          {templates.isPending ? (
            <TableSkeleton rows={6} />
          ) : (
            templates.data?.data.map((t) => (
              <div key={t.id} className="list-row">
                <div className="grow min-w-0">
                  <div className="cell-main flex items-center gap-2">
                    {t.name}
                    {t.is_default && <StatusBadge tone="approved">Default</StatusBadge>}
                  </div>
                  <div className="cell-sub truncate">
                    {getNotificationTypeLabel(t.type)} · {t.subject}
                  </div>
                </div>
                {manage && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                      Edit
                    </Button>
                    {!t.is_system && (
                      <Button size="icon" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
                        <Trash2 />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </section>
      )}
      <NotificationSheet id={openId} onClose={() => setOpenId(null)} />
      {editing && <TemplateDialog key={editing === "new" ? "new" : editing.id} template={editing} variables={templates.data?.variables ?? []} onClose={() => setEditing(null)} />}
      <ConfirmationDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        variant="destructive"
        title={`Delete “${deleting?.name}”?`}
        description="Messages already sent are not affected."
        confirmText="Delete"
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
};

export default NotificationsPage;

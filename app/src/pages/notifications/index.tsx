import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("notifications");
  const n = useNotification(id);
  const retry = useRetryNotification();
  const { can } = useWorkspace();
  const d = n.data;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="display text-[24px] font-medium">{d?.subject ?? t("sheet.fallbackTitle")}</SheetTitle>
          <SheetDescription>{d ? `${getNotificationTypeLabel(d.type)} · ${d.trigger === "MANUAL" ? t("triggers.manual") : t("triggers.automatic")}` : " "}</SheetDescription>
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
                  {t("list.retry")}
                </Button>
              )}
            </div>
            <dl className="kv">
              <dt>{t("sheet.recipient")}</dt>
              <dd>
                {d.recipient_name ? `${d.recipient_name} · ` : ""}
                {d.recipient_address}
              </dd>
              <dt>{t("sheet.channel")}</dt>
              <dd>{t("sheet.channelEmail")}</dd>
              <dt>{t("sheet.client")}</dt>
              <dd>{d.client ? <Link to={Routes.clients.detail(d.client.id)}>{d.client.name}</Link> : "—"}</dd>
              <dt>{t("sheet.assignment")}</dt>
              <dd>{d.assignment ? <Link to={Routes.assignments.detail(d.assignment.id)}>{d.assignment.form_name}</Link> : "—"}</dd>
              <dt>{t("sheet.created")}</dt>
              <dd>{formatDateTime(d.created_at)}</dd>
              {d.scheduled_for && (
                <>
                  <dt>{t("sheet.scheduledFor")}</dt>
                  <dd>{t("sheet.scheduledQuiet", { date: formatDateTime(d.scheduled_for) })}</dd>
                </>
              )}
              <dt>{t("sheet.sent")}</dt>
              <dd>{formatDateTime(d.sent_at)}</dd>
              <dt>{t("sheet.provider")}</dt>
              <dd>
                {d.provider ?? "—"}
                {d.provider_message_id ? <span className="mono"> · {d.provider_message_id}</span> : ""}
              </dd>
              {d.failure_reason && (
                <>
                  <dt>{t("sheet.failureReason")}</dt>
                  <dd className="text-[var(--g-error-ink)]">{d.failure_reason}</dd>
                </>
              )}
              {d.sent_by && (
                <>
                  <dt>{t("sheet.sentBy")}</dt>
                  <dd>{d.sent_by}</dd>
                </>
              )}
            </dl>
            <div>
              <span className="label">{t("sheet.message")}</span>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border bg-[var(--g-surface-soft)] p-4 font-sans text-[13.5px]">{d.body}</pre>
            </div>
            <div>
              <span className="label">{t("sheet.attempts")}</span>
              <ul className="timeline mt-2">
                {d.jobs.map((j) => (
                  <li key={j.id}>
                    <span className={cn("ico", j.status === "COMPLETED" ? "ok" : j.status === "FAILED" || j.status === "RETRYING" ? "bad" : "")}>{j.attempt}</span>
                    <div>
                      <div>
                        {t("sheet.attemptLine", { status: t(`jobStatuses.${j.status}`, { defaultValue: j.status.toLowerCase() }), attempt: j.attempt, max: j.max_attempts, trigger: t(`jobTriggers.${j.trigger}`, { defaultValue: j.trigger.toLowerCase().replace("_", " ") }) })}
                      </div>
                      <div className="when">
                        {t("sheet.queued", { date: formatDateTime(j.queued_at) })}
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
  const { t } = useTranslation("notifications");
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
          <DialogTitle className="display text-[26px] font-medium">{editing ? t("dialog.editTitle") : t("dialog.newTitle")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="t-name">{t("dialog.name")}</Label>
              <Input id="t-name" placeholder={t("dialog.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <Label>{t("dialog.usedFor")}</Label>
              <FilterSelect label={t("dialog.typeAria")} size="default" className="w-full" value={type} onChange={(v) => setType(v as NotificationType)} options={NotificationTypeFormOptions.filter((o) => !["EMAIL_VERIFICATION", "PASSWORD_RESET", "CUSTOM"].includes(o.id))} />
            </div>
          </div>
          <div className="field">
            <Label htmlFor="t-subject">{t("dialog.subject")}</Label>
            <Input id="t-subject" placeholder={t("dialog.subjectPlaceholder", { company_name: "{{company_name}}" })} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field">
            <Label htmlFor="t-body">{t("dialog.message")}</Label>
            <Textarea id="t-body" placeholder={t("dialog.messagePlaceholder", { client_name: "{{client_name}}" })} rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="chips mt-1">
              {variables.map((v) => (
                <button key={v} type="button" className="chip hover:bg-[var(--g-surface-cream-strong)]" onClick={() => setBody((b) => `${b}{{${v}}}`)}>
                  <code className="var">{`{{${v}}}`}</code>
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="label">{t("dialog.useByDefault")}</span>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("dialog.cancel")}
          </Button>
          <Button loading={pending} disabled={!name.trim() || !body.trim()} onClick={submit}>
            {t("dialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const NotificationsPage: FC = () => {
  const { t } = useTranslation("notifications");
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
        title={t("list.title")}
        description={t("list.description")}
        actions={
          manage && (
            <Button variant="outline" asChild>
              <Link to={Routes.settings.tab("notifications")}>
                <Settings />
                {t("list.settings")}
              </Link>
            </Button>
          )
        }
      />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "history"} className={cn("tab", tab === "history" && "active")} onClick={() => setTab("history")}>
          {t("list.tabHistory")}
        </button>
        <button role="tab" aria-selected={tab === "templates"} className={cn("tab", tab === "templates" && "active")} onClick={() => setTab("templates")}>
          {t("list.tabTemplates")} <span className="n">{templates.data?.data.length ?? 0}</span>
        </button>
      </div>

      {tab === "history" ? (
        <section className="card">
          <div className="toolbar">
            <div className="search">
              <Search className="icon h-4 w-4" />
              <Input aria-label={t("list.searchAria")} className="h-8 pl-9 text-[13px]" placeholder={t("list.searchPlaceholder")} value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} />
            </div>
            <FilterSelect label={t("list.statusFilter")} value={status} onChange={(v) => (setStatus(v), setPage(1))} options={NotificationStatusFilterOptions.map((o) => ({ ...o, label: o.id !== "all" && counts[o.id] ? `${o.label} (${counts[o.id]})` : o.label }))} />
            <FilterSelect label={t("list.typeFilter")} value={type} onChange={(v) => (setType(v), setPage(1))} options={NotificationTypeFilterOptions} />
          </div>
          {history.isPending ? (
            <TableSkeleton rows={8} />
          ) : !history.data?.data.length ? (
            <EmptyState icon={<Bell className="h-5 w-5" />} title={t("list.emptyTitle")} description={t("list.emptyDescription")} />
          ) : (
            <div className="table-wrap">
              <Table className="table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("list.columns.recipient")}</TableHead>
                    <TableHead>{t("list.columns.message")}</TableHead>
                    <TableHead>{t("list.columns.type")}</TableHead>
                    <TableHead>{t("list.columns.created")}</TableHead>
                    <TableHead>{t("list.columns.status")}</TableHead>
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
                        <div className="cell-sub">{n.trigger === "MANUAL" ? (n.sent_by ? t("triggers.manualBy", { name: n.sent_by }) : t("triggers.manualLabel")) : t("triggers.automaticLabel")}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(n.created_at)}</TableCell>
                      <TableCell>
                        <NotificationStatusBadge status={n.status} />
                      </TableCell>
                      <TableCell className="actions" onClick={(e) => e.stopPropagation()}>
                        {n.status === "FAILED" && can(Permissions.REMINDERS_SEND) && (
                          <Button size="sm" variant="outline" loading={retry.isPending && retry.variables === n.id} onClick={() => retry.mutate(n.id)}>
                            <RotateCcw />
                            {t("list.retry")}
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
                {t("list.range", { from: (pg.page - 1) * pg.limit + 1, to: Math.min(pg.page * pg.limit, pg.total), total: pg.total })}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!pg.has_prev} onClick={() => setPage((p) => p - 1)}>
                  {t("list.previous")}
                </Button>
                <Button size="sm" variant="outline" disabled={!pg.has_next} onClick={() => setPage((p) => p + 1)}>
                  {t("list.next")}
                </Button>
              </span>
            </div>
          )}
        </section>
      ) : (
        <section className="card">
          <div className="card-head">
            <h3>{t("templates.title")}</h3>
            {manage && (
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus />
                {t("templates.new")}
              </Button>
            )}
          </div>
          {templates.isPending ? (
            <TableSkeleton rows={6} />
          ) : (
            templates.data?.data.map((tpl) => (
              <div key={tpl.id} className="list-row">
                <div className="grow min-w-0">
                  <div className="cell-main flex items-center gap-2">
                    {tpl.name}
                    {tpl.is_default && <StatusBadge tone="approved">{t("templates.default")}</StatusBadge>}
                  </div>
                  <div className="cell-sub truncate">
                    {getNotificationTypeLabel(tpl.type)} · {tpl.subject}
                  </div>
                </div>
                {manage && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(tpl)}>
                      {t("templates.edit")}
                    </Button>
                    {!tpl.is_system && (
                      <Button size="icon" variant="ghost" aria-label={t("templates.deleteAria", { name: tpl.name })} onClick={() => setDeleting(tpl)}>
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
        title={t("templates.deleteTitle", { name: deleting?.name })}
        description={t("templates.deleteDescription")}
        confirmText={t("templates.deleteConfirm")}
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
};

export default NotificationsPage;

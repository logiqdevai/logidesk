import { useEffect, useState, type FC } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bell, FilePlus2, Plus, Send, Upload, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardsSkeleton, EmptyState, PageHeader, Panel, ProgressCell, SegmentedProgress, StatCard, TableSkeleton } from "@/components/ui/page-elements";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDashboard, useSendBulkReminders } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { Routes } from "@/routes/routes";
import { greeting, longToday } from "@/lib/format";
import { ActivityTimeline } from "@/pages/shared/components/activity-timeline";
import { AssignDialog } from "@/pages/shared/components/assign-dialog";
import { UploadDialog } from "@/pages/shared/components/upload-dialog";
import { ReminderDialog } from "@/pages/shared/components/reminder-dialog";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";

const DashboardPage: FC = () => {
  const { data, isPending, isError, error, refetch } = useDashboard();
  const { me, workspace, can } = useWorkspace();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [assignOpen, setAssignOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [remindClient, setRemindClient] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const bulk = useSendBulkReminders();

  useEffect(() => {
    if (params.get("reminders") === "1" && data) {
      setSelected(data.attention.map((a) => a.client_id));
      document.getElementById("reminders")?.scrollIntoView({ behavior: "smooth" });
      params.delete("reminders");
      setParams(params, { replace: true });
    }
  }, [params, data, setParams]);

  const s = data?.stats;
  const p = data?.progress;
  const quick = [
    can(Permissions.CLIENTS_CREATE) && { label: "Add client", icon: UserPlus, onClick: () => navigate(Routes.clients.new) },
    can(Permissions.FORMS_MANAGE) && { label: "Create document form", icon: FilePlus2, onClick: () => navigate(Routes.forms.new) },
    { label: "Assign a form", icon: Send, onClick: () => setAssignOpen(true) },
    { label: "Upload a document", icon: Upload, onClick: () => setUploadOpen(true) },
    {
      label: "Send reminders",
      icon: Bell,
      onClick: () => {
        setSelected(data?.attention.map((a) => a.client_id) ?? []);
        document.getElementById("reminders")?.scrollIntoView({ behavior: "smooth" });
      },
    },
  ].filter(Boolean) as Array<{ label: string; icon: typeof Bell; onClick: () => void }>;

  return (
    <>
      <PageHeader
        eyebrow={longToday()}
        title={`${greeting()}${me?.user.first_name ? `, ${me.user.first_name}` : ""}`}
        description={`Here is where document collection stands across ${workspace?.name ?? "your workspace"}.`}
        actions={
          <>
            {can(Permissions.CLIENTS_CREATE) && (
              <Button variant="outline" onClick={() => navigate(Routes.clients.new)}>
                <Plus />
                Add client
              </Button>
            )}
            <Button
              onClick={() => {
                if (selected.length) return setBulkOpen(true);
                setSelected(data?.attention.map((x) => x.client_id) ?? []);
                document.getElementById("reminders")?.scrollIntoView({ behavior: "smooth" });
              }}
              disabled={!data?.attention.length}
              title={data && !data.attention.length ? "No client has missing, expired or overdue documents" : undefined}
            >
              <Send />
              Send reminders{selected.length ? ` (${selected.length})` : ""}
            </Button>
          </>
        }
      />

      <section className="gr c5 mb-4" aria-label="Quick actions">
        {quick.map((q) => (
          <button key={q.label} className="card clickable flex items-center gap-3 p-4 text-left font-medium text-[var(--g-ink)]" onClick={q.onClick}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--g-primary-tint)] text-[var(--g-primary-active)]">
              <q.icon className="h-4 w-4" />
            </span>
            {q.label}
          </button>
        ))}
      </section>

      {isError ? (
        <div className="callout bad">
          <span className="grow">{error.message}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isPending || !s || !p ? (
        <CardsSkeleton count={10} />
      ) : (
        <section className="gr c5" aria-label="Statistics">
          <StatCard label="Total clients" value={s.total_clients} to={Routes.clients.root} />
          <StatCard label="Assigned forms" value={s.assigned_forms} />
          <StatCard label="Awaiting submission" value={s.awaiting_submission} tone={s.awaiting_submission ? "alert" : undefined} to={`${Routes.documents}?status=MISSING`} />
          <StatCard label="Awaiting review" value={s.awaiting_review} tone={s.awaiting_review ? "warn" : undefined} to={`${Routes.documents}?status=UNDER_REVIEW`} />
          <StatCard label="Approved" value={s.approved} to={`${Routes.documents}?status=APPROVED`} />
          <StatCard label="Rejected" value={s.rejected} tone={s.rejected ? "alert" : undefined} to={`${Routes.documents}?status=REJECTED`} />
          <StatCard label="Expired" value={s.expired} tone={s.expired ? "alert" : undefined} to={`${Routes.documents}?status=EXPIRED`} />
          <StatCard label="Expiring soon" value={s.expiring_soon} sub="Next 30 days" tone={s.expiring_soon ? "warn" : undefined} to={`${Routes.documents}?status=EXPIRING_SOON`} />
          <StatCard label="Overdue submissions" value={s.overdue_submissions} tone={s.overdue_submissions ? "alert" : undefined} />
          <StatCard label="Inbox needs review" value={s.inbox_needs_review} tone={s.inbox_needs_review ? "warn" : undefined} to={Routes.inbox.root} />
        </section>
      )}

      <div className="gr main-side mt-5">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Document collection progress" actions={<Link to={Routes.documents} className="caption">View all documents</Link>}>
            <div className="card-body">
              {!p ? (
                <TableSkeleton rows={2} className="p-0" />
              ) : p.requested === 0 ? (
                <p className="muted">No documents requested yet. Assign a form to a client to start collecting.</p>
              ) : (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="num text-[44px]">{p.percent}%</span>
                      <span className="muted"> complete</span>
                    </div>
                    <span className="muted">{p.requested} requested documents</span>
                  </div>
                  <SegmentedProgress large className="mt-4" total={p.requested} ok={p.completed} review={p.awaiting_review} bad={p.expired + p.rejected} />
                  <div className="legend mt-4">
                    <span><i style={{ background: "var(--g-success)" }} />{p.completed} completed</span>
                    <span><i style={{ background: "var(--g-amber)" }} />{p.awaiting_review} awaiting review</span>
                    <span><i style={{ background: "var(--g-surface-cream-strong)" }} />{p.missing} missing</span>
                    <span><i style={{ background: "var(--g-error)" }} />{p.rejected} rejected · {p.expired} expired</span>
                  </div>
                </>
              )}
            </div>
          </Panel>

          <section className="card" id="reminders">
            <div className="card-head">
              <h3>Clients needing attention</h3>
              <span className="caption">Missing, expired or overdue documents</span>
            </div>
            {!data ? (
              <TableSkeleton rows={4} />
            ) : !data.attention.length ? (
              <EmptyState title="Everyone is up to date" description="No client has missing, expired or overdue documents right now." />
            ) : (
              <div className="table-wrap">
                <Table className="table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          aria-label="Select all"
                          checked={selected.length === data.attention.length}
                          onCheckedChange={(c) => setSelected(c ? data.attention.map((a) => a.client_id) : [])}
                        />
                      </TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Missing</TableHead>
                      <TableHead>Expired</TableHead>
                      <TableHead>Expiring</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="actions" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.attention.map((a) => (
                      <TableRow key={a.client_id}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Select ${a.name}`}
                            checked={selected.includes(a.client_id)}
                            onCheckedChange={(c) => setSelected((list) => (c ? [...list, a.client_id] : list.filter((x) => x !== a.client_id)))}
                          />
                        </TableCell>
                        <TableCell>
                          <Link to={Routes.clients.detail(a.client_id)} className="cell-main block">
                            {a.name}
                          </Link>
                          <span className="cell-sub">{a.company ?? (a.overdue_forms ? `${a.overdue_forms} overdue form(s)` : "")}</span>
                        </TableCell>
                        <TableCell>{a.missing ? <StatusBadge tone="missing">{a.missing}</StatusBadge> : "—"}</TableCell>
                        <TableCell>{a.expired ? <StatusBadge tone="expired">{a.expired}</StatusBadge> : "—"}</TableCell>
                        <TableCell>{a.expiring ? <StatusBadge tone="expiring">{a.expiring}</StatusBadge> : "—"}</TableCell>
                        <TableCell>
                          <ProgressCell percent={a.progress_percent} />
                        </TableCell>
                        <TableCell className="actions">
                          <Button size="sm" variant="outline" onClick={() => setRemindClient(a.client_id)} disabled={!a.email}>
                            Remind
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card coral pad">
            <p className="eyebrow" style={{ color: "rgba(255,255,255,.75)" }}>
              Document Inbox
            </p>
            <h2 className="mt-2 text-[30px]">
              {s ? (s.inbox_needs_review ? `${s.inbox_needs_review} document${s.inbox_needs_review === 1 ? " is" : "s are"} waiting for your review` : "Nothing is waiting for review") : " "}
            </h2>
            <p className="mb-4 mt-2 opacity-90">Approve or reject uploads so clients see their updated status.</p>
            <Button asChild className="bg-[var(--g-canvas)] text-[var(--g-ink)] hover:bg-white">
              <Link to={Routes.inbox.root}>Open inbox</Link>
            </Button>
          </section>
          <Panel title="Recent activity">
            <div className="max-h-[520px] overflow-y-auto px-5 py-2">{!data ? <TableSkeleton rows={4} className="p-0" /> : <ActivityTimeline items={data.recent_activity} />}</div>
          </Panel>
        </aside>
      </div>

      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} />
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <ReminderDialog open={!!remindClient} onOpenChange={(o) => !o && setRemindClient(null)} clientId={remindClient} />
      <ConfirmationDialog
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={`Send reminders to ${selected.length} client${selected.length === 1 ? "" : "s"}?`}
        description="Each client receives one email listing all of their missing, rejected or expired documents, using your Missing documents template."
        confirmText="Send reminders"
        isLoading={bulk.isPending}
        onConfirm={() =>
          bulk.mutate(selected, {
            onSuccess: () => {
              setBulkOpen(false);
              setSelected([]);
            },
          })
        }
      />
    </>
  );
};

export default DashboardPage;

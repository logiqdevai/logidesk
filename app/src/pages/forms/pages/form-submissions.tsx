import { useEffect, useState, type FC } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, MoreHorizontal, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CardsSkeleton, EmptyState, InitialsAvatar, StatCard, TableSkeleton } from "@/components/ui/page-elements";
import { AssignmentStatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { useExportStatus, useExportSubmissions, useSubmissions, useTeam } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { AssignmentStatusFilterOptions } from "@/config/constants/dropdowns/documents/assignment-status-filter.options";
import { SubmittedFilterOptions } from "@/config/constants/dropdowns/documents/uploaded-filter.options";
import { Routes } from "@/routes/routes";
import { formatDate } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounced";
import { ReminderDialog } from "@/pages/shared/components/reminder-dialog";
import { AssignDialog } from "@/pages/shared/components/assign-dialog";

/** Polls the CSV export and starts the download when it is ready. */
const CsvExport: FC<{ exportId: string; onDone: () => void }> = ({ exportId, onDone }) => {
  const status = useExportStatus(exportId);
  const s = status.data;
  useEffect(() => {
    if (s?.status === "COMPLETED" && s.url) {
      window.location.assign(s.url);
      onDone();
    }
  }, [s, onDone]);
  return <span className="caption">{s?.status === "FAILED" ? `Export failed: ${s.error}` : "Preparing CSV…"}</span>;
};

const FormSubmissionsPage: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useWorkspace();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState("all");
  const [employee, setEmployee] = useState("all");
  const [submitted, setSubmitted] = useState("any");
  const [client, setClient] = useState("all");
  const [remind, setRemind] = useState<{ clientId: string; assignmentId: string } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [exportId, setExportId] = useState<string | null>(null);
  const team = useTeam();
  const filters = { search: debounced, status, employee_id: employee, submitted, client_id: client };
  const subs = useSubmissions(id, filters);
  const exporter = useExportSubmissions();
  const data = subs.data;

  const clientOptions = [{ id: "all", label: "All clients" }, ...Array.from(new Map((data?.data ?? []).map((r) => [r.client.id, { id: r.client.id, label: r.client.name }])).values())];
  const employeeOptions = [{ id: "all", label: "All employees" }, ...(team.data?.members ?? []).map((m) => ({ id: m.member_id, label: m.name }))];

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={Routes.forms.root}>Forms &amp; Templates</Link>
        <span>›</span>
        {data ? can(Permissions.FORMS_MANAGE) ? <Link to={Routes.forms.edit(id!)}>{data.form.name}</Link> : <span>{data.form.name}</span> : <span>…</span>}
        <span>›</span>
        <span>Submissions</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>Submissions</h1>
          <p>Every client {data ? `“${data.form.name}”` : "this form"} was assigned to.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exportId && <CsvExport exportId={exportId} onDone={() => setExportId(null)} />}
          <Button variant="outline" loading={exporter.isPending || !!exportId} onClick={() => exporter.mutate({ id: id!, ...filters }, { onSuccess: (r) => setExportId(r.export_id) })}>
            <Download />
            Export CSV
          </Button>
          {can(Permissions.FORMS_MANAGE) && (
            <Button variant="outline" asChild>
              <Link to={Routes.forms.edit(id!)}>
                <Pencil />
                Edit form
              </Link>
            </Button>
          )}
          <Button onClick={() => setAssignOpen(true)} disabled={data?.form.status !== "PUBLISHED"}>
            Assign to a client
          </Button>
        </div>
      </div>

      {!data ? (
        <CardsSkeleton count={4} className="mb-4" />
      ) : (
        <section className="gr c4 mb-4">
          <StatCard label="Assigned clients" value={data.summary.assigned} />
          <StatCard label="Complete" value={data.summary.complete} />
          <StatCard label="Under review" value={data.summary.under_review} tone={data.summary.under_review ? "warn" : undefined} />
          <StatCard label="Overdue" value={data.summary.overdue} tone={data.summary.overdue ? "alert" : undefined} />
        </section>
      )}

      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Search className="icon h-4 w-4" />
            <Input aria-label="Search submissions" className="h-8 pl-9 text-[13px]" placeholder="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterSelect label="Client" value={client} onChange={setClient} options={clientOptions} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={AssignmentStatusFilterOptions} />
          <FilterSelect label="Assigned employee" value={employee} onChange={setEmployee} options={employeeOptions} />
          <FilterSelect label="Submission time" value={submitted} onChange={setSubmitted} options={SubmittedFilterOptions} />
        </div>
        {subs.isPending ? (
          <TableSkeleton rows={6} />
        ) : subs.isError ? (
          <div className="callout bad m-4">{subs.error.message}</div>
        ) : !data?.data.length ? (
          <EmptyState title="No submissions match" description={data?.summary.assigned ? "Try different filters." : "Assign this form to a client to start collecting."} />
        ) : (
          <div className="table-wrap">
            <Table className="table">
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Assigned employees</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Last submission</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((r) => (
                  <TableRow key={r.assignment_id} className="clickable" onClick={() => navigate(Routes.assignments.detail(r.assignment_id))}>
                    <TableCell>
                      <div className="cell-main">{r.client.name}</div>
                      <div className="cell-sub">{r.client.company ?? r.client.email ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="avatars">
                        {r.assignees.slice(0, 3).map((a) => (
                          <span key={a.member_id} title={a.name}>
                            <InitialsAvatar name={a.name} size="sm" />
                          </span>
                        ))}
                        {!r.assignees.length && <span className="muted">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(r.assigned_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.last_submission_at ? formatDate(r.last_submission_at) : <span className="muted">Not submitted yet</span>}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(r.deadline)}</TableCell>
                    <TableCell>
                      {r.requirements_completed} / {r.requirements_total}
                    </TableCell>
                    <TableCell>
                      <AssignmentStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="actions" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label={`Actions for ${r.client.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(Routes.assignments.detail(r.assignment_id))}>View full form</DropdownMenuItem>
                          {can(Permissions.ASSIGNMENTS_MANAGE) && <DropdownMenuItem onSelect={() => navigate(Routes.assignments.edit(r.assignment_id))}>Edit answers</DropdownMenuItem>}
                          <DropdownMenuItem onSelect={() => navigate(Routes.clients.detail(r.client.id))}>Open client</DropdownMenuItem>
                          <DropdownMenuItem disabled={!r.client.email} onSelect={() => setRemind({ clientId: r.client.id, assignmentId: r.assignment_id })}>
                            Send reminder
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate(`${Routes.inbox.root}?client=${r.client.id}`)}>Review in Document Inbox</DropdownMenuItem>
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
      <ReminderDialog open={!!remind} onOpenChange={(o) => !o && setRemind(null)} clientId={remind?.clientId ?? null} assignmentId={remind?.assignmentId} />
      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} formId={id} />
    </>
  );
};

export default FormSubmissionsPage;

import { useEffect, useMemo, useState, type FC } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Ban, Pencil, Save, Send, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { DetailSkeleton, Panel, SegmentedProgress } from "@/components/ui/page-elements";
import { AssignmentStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import {
  useAssignment,
  useCancelAssignment,
  useReviewDocument,
  useSaveAnswers,
  useUpdateAssignment,
  useUpdateRequirement,
} from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import type { AssignmentRequirement } from "@/features/assignments/interfaces/assignments.interfaces";
import type { ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";
import type { ApiError } from "@/lib/api-error";
import { Routes } from "@/routes/routes";
import { formatDate, formatDateTime } from "@/lib/format";
import { FormRenderer } from "@/pages/shared/components/form-renderer";
import { ActivityTimeline } from "@/pages/shared/components/activity-timeline";
import { UploadDialog } from "@/pages/shared/components/upload-dialog";
import { ReminderDialog } from "@/pages/shared/components/reminder-dialog";
import { RejectDialog } from "@/pages/shared/components/review-dialogs";
import { DocumentSheet } from "@/pages/shared/components/document-sheet";
import { ScheduleEditor } from "@/pages/shared/components/schedule-editor";
import { RequirementCard } from "./components/requirement-card";

/** Client form view: everything the client submitted for one assignment (read-only or edit). */
const AssignmentPage: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { can } = useWorkspace();
  const assignment = useAssignment(id);
  const save = useSaveAnswers();
  const review = useReviewDocument();
  const updateReq = useUpdateRequirement();
  const updateAssignment = useUpdateAssignment();
  const cancel = useCancelAssignment();
  const editing = params.get("edit") === "1";
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [upload, setUpload] = useState<string | null>(null);
  const [remind, setRemind] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; name: string } | null>(null);
  const [settingsFor, setSettingsFor] = useState<AssignmentRequirement | null>(null);
  const [reqDeadline, setReqDeadline] = useState("");
  const [reqOverride, setReqOverride] = useState(false);
  const [reqSchedule, setReqSchedule] = useState<ReminderScheduleInput>({});
  const [notRequired, setNotRequired] = useState<AssignmentRequirement | null>(null);
  const [notRequiredReason, setNotRequiredReason] = useState("");
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const a = assignment.data;
  useEffect(() => {
    if (a) setAnswers(a.response.answers ?? {});
  }, [a]);

  const reqByField = useMemo(() => new Map((a?.requirements ?? []).map((r) => [r.field_key, r])), [a]);

  if (assignment.isPending) return <DetailSkeleton />;
  if (assignment.isError || !a) return <div className="callout bad">{assignment.error?.message ?? "Form not found"}</div>;

  const canEdit = can(Permissions.ASSIGNMENTS_MANAGE) && !a.cancelled_at;
  const setEditing = (on: boolean) => {
    if (on) params.set("edit", "1");
    else params.delete("edit");
    setParams(params, { replace: true });
    if (!on) {
      setAnswers(a.response.answers ?? {});
      setErrors({});
    }
  };
  const onSave = (submit = false) =>
    save.mutate(
      { id: a.id, answers, submit },
      {
        onSuccess: () => {
          setErrors({});
          setEditing(false);
        },
        onError: (e) => setErrors((e as ApiError).fieldErrors ?? {}),
      },
    );

  const active = a.requirements.filter((r) => r.status !== "NOT_REQUIRED");
  const count = (...s: string[]) => active.filter((r) => s.includes(r.status)).length;

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={Routes.clients.root}>Clients</Link>
        <span>›</span>
        <Link to={Routes.clients.tab(a.client.id, "forms")}>{a.client.name}</Link>
        <span>›</span>
        <span>{a.form.name}</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>{a.title}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2">
            <AssignmentStatusBadge status={a.status} />
            {editing && <StatusBadge tone="coral">Editing</StatusBadge>}
            <span className="muted">
              {a.client.name}
              {a.client.company ? ` · ${a.client.company}` : ""} · assigned {formatDate(a.assigned_at)}
              {a.assigned_by ? ` by ${a.assigned_by}` : ""}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={save.isPending}>
                <X />
                Discard
              </Button>
              <Button variant="outline" loading={save.isPending && !save.variables?.submit} onClick={() => onSave(false)}>
                <Save />
                Save changes
              </Button>
              {a.response.status !== "SUBMITTED" && (
                <Button loading={save.isPending && !!save.variables?.submit} onClick={() => onSave(true)}>
                  Save &amp; mark submitted
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setRemind(true)} disabled={!!a.cancelled_at}>
                <Send />
                Send reminder
              </Button>
              {can(Permissions.DOCUMENTS_UPLOAD) && !a.cancelled_at && (
                <Button variant="outline" onClick={() => setUpload("")}>
                  <Upload />
                  Upload on behalf
                </Button>
              )}
              {canEdit && (
                <Button onClick={() => setEditing(true)}>
                  <Pencil />
                  Edit answers
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {a.cancelled_at && <div className="callout warn mb-4">This assignment was cancelled on {formatDate(a.cancelled_at)}. It is kept for the record.</div>}
      {editing && (
        <div className="callout mb-4">
          <Pencil className="h-4 w-4 shrink-0" />
          <span>You are editing on the client's behalf. Answers are validated against the version of the form this assignment was created with, and every change is recorded in the audit log.</span>
        </div>
      )}

      <div className="gr main-side">
        <div className="flex min-w-0 flex-col gap-4">
          {(a.instructions || a.description || a.message) && (
            <div className="card pad">
              {a.description && <p>{a.description}</p>}
              {a.instructions && <p className="muted mt-1 whitespace-pre-line">{a.instructions}</p>}
              {a.message && <p className="mt-2 italic">Message to client: “{a.message}”</p>}
            </div>
          )}
          <FormRenderer
            definition={a.definition}
            answers={answers}
            readOnly={!editing}
            errors={errors}
            onChange={(k, v) => setAnswers((x) => ({ ...x, [k]: v }))}
            renderFile={(field) => {
              const r = reqByField.get(field.id);
              if (!r) return null;
              return (
                <RequirementCard
                  requirement={r}
                  canUpload={can(Permissions.DOCUMENTS_UPLOAD) && !a.cancelled_at}
                  canReview={can(Permissions.DOCUMENTS_REVIEW)}
                  canManage={canEdit}
                  reviewPending={review.isPending}
                  onUpload={() => setUpload(r.id)}
                  onPreview={setPreview}
                  onApprove={(docId) => review.mutate({ id: docId, decision: "APPROVED" })}
                  onReject={(docId) => setRejecting({ id: docId, name: r.name })}
                  onSettings={() => {
                    setSettingsFor(r);
                    setReqDeadline(r.deadline ?? "");
                    setReqOverride(!!r.reminder_override);
                    setReqSchedule(r.reminder_override ?? { enabled: r.reminder?.enabled, start_days_before: r.reminder?.start_days_before, interval_count: r.reminder?.interval_count, interval_unit: r.reminder?.interval_unit, send_time: r.reminder?.send_time, overdue_enabled: r.reminder?.overdue_enabled, overdue_interval_count: r.reminder?.overdue_interval_count, overdue_interval_unit: r.reminder?.overdue_interval_unit, overdue_max_count: r.reminder?.overdue_max_count });
                  }}
                  onToggleRequired={() => {
                    if (r.status === "NOT_REQUIRED") updateReq.mutate({ id: a.id, requirementId: r.id, not_required: false });
                    else {
                      setNotRequiredReason("");
                      setNotRequired(r);
                    }
                  }}
                />
              );
            }}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card pad">
            <div className="flex items-center justify-between">
              <h3>Completion</h3>
              <span className="num text-[32px]">{a.progress_percent}%</span>
            </div>
            <SegmentedProgress className="mt-3" large total={active.length || 1} ok={count("APPROVED")} review={count("UNDER_REVIEW", "SUBMITTED")} bad={count("REJECTED", "EXPIRED")} />
            <dl className="kv mt-4">
              <dt>Documents</dt>
              <dd>
                {a.requirements_completed} of {a.requirements_total} approved
              </dd>
              <dt>Missing</dt>
              <dd>{a.requirements_missing}</dd>
              <dt>Expired</dt>
              <dd>{a.requirements_expired}</dd>
              <dt>Answers</dt>
              <dd>{a.response.status === "SUBMITTED" ? `Submitted ${formatDateTime(a.response.submitted_at)}` : a.response.last_saved_at ? `Draft saved ${formatDateTime(a.response.last_saved_at)}` : "Not started"}</dd>
              <dt>Deadline</dt>
              <dd className="flex items-center gap-2">
                {formatDate(a.deadline)}
                {canEdit && (
                  <button
                    className="link-btn text-[13px]"
                    onClick={() => {
                      setDeadline(a.deadline ?? "");
                      setDeadlineOpen(true);
                    }}
                  >
                    Change
                  </button>
                )}
              </dd>
            </dl>
            {canEdit && (
              <Button variant="ghost" size="sm" className="mt-4 text-[var(--g-error-ink)]" onClick={() => setCancelling(true)}>
                <Ban />
                Cancel assignment
              </Button>
            )}
          </div>
          <Panel title="Recent changes">
            <div className="px-5 py-2">
              <ActivityTimeline items={a.recent_changes ?? []} showClient={false} empty="No changes yet." />
            </div>
          </Panel>
        </aside>
      </div>

      <UploadDialog open={upload !== null} onOpenChange={(o) => !o && setUpload(null)} clientId={a.client.id} clientName={a.client.name} assignmentId={a.id} requirementId={upload || undefined} />
      <ReminderDialog open={remind} onOpenChange={setRemind} clientId={a.client.id} assignmentId={a.id} />
      <DocumentSheet documentId={preview} onClose={() => setPreview(null)} />
      <RejectDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        documentName={rejecting?.name ?? ""}
        pending={review.isPending}
        onConfirm={(reason) => rejecting && review.mutate({ id: rejecting.id, decision: "REJECTED", reason }, { onSuccess: () => setRejecting(null) })}
      />
      <Dialog open={!!settingsFor} onOpenChange={(o) => !updateReq.isPending && !o && setSettingsFor(null)}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="display text-[26px] font-medium">{settingsFor?.name}</DialogTitle>
            <DialogDescription>Deadline and reminder schedule for this document only. Leave empty to use the assignment settings.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="field max-w-xs">
              <Label htmlFor="req-deadline">Own deadline</Label>
              <Input id="req-deadline" type="date" value={reqDeadline} onChange={(e) => setReqDeadline(e.target.value)} />
              <span className="hint">Empty uses the assignment deadline ({formatDate(a.deadline)}).</span>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="label">Override the reminder schedule</span>
              <Switch checked={reqOverride} onCheckedChange={setReqOverride} />
            </label>
            {reqOverride ? <ScheduleEditor value={reqSchedule} onChange={setReqSchedule} /> : <p className="caption">Effective: {settingsFor?.reminder?.summary}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsFor(null)}>
              Cancel
            </Button>
            <Button
              loading={updateReq.isPending}
              onClick={() =>
                settingsFor &&
                updateReq.mutate(
                  { id: a.id, requirementId: settingsFor.id, deadline: reqDeadline || null, reminder: reqOverride ? reqSchedule : null },
                  { onSuccess: () => setSettingsFor(null) },
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!notRequired} onOpenChange={(o) => !o && setNotRequired(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[24px] font-medium">Mark “{notRequired?.name}” as not required?</DialogTitle>
            <DialogDescription>It no longer counts toward completion and reminders stop. You can undo this later.</DialogDescription>
          </DialogHeader>
          <div className="field">
            <Label htmlFor="nr-reason">Reason (optional)</Label>
            <Textarea id="nr-reason" placeholder="e.g. The client no longer needs to provide this" rows={2} value={notRequiredReason} onChange={(e) => setNotRequiredReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotRequired(null)}>
              Cancel
            </Button>
            <Button
              loading={updateReq.isPending}
              onClick={() =>
                notRequired &&
                updateReq.mutate({ id: a.id, requirementId: notRequired.id, not_required: true, not_required_reason: notRequiredReason || undefined }, { onSuccess: () => setNotRequired(null) })
              }
            >
              Mark not required
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deadlineOpen} onOpenChange={setDeadlineOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submission deadline</DialogTitle>
            <DialogDescription>Requirements without their own deadline use this date.</DialogDescription>
          </DialogHeader>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label="Deadline" />
          <DialogFooter>
            <Button variant="outline" onClick={() => updateAssignment.mutate({ id: a.id, deadline: null }, { onSuccess: () => setDeadlineOpen(false) })}>
              Remove deadline
            </Button>
            <Button loading={updateAssignment.isPending} disabled={!deadline} onClick={() => updateAssignment.mutate({ id: a.id, deadline }, { onSuccess: () => setDeadlineOpen(false) })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog
        isOpen={cancelling}
        onClose={() => setCancelling(false)}
        variant="destructive"
        title="Cancel this assignment?"
        description="The form disappears from the client's portal and reminders stop. Submitted documents are kept for the record."
        confirmText="Cancel assignment"
        isLoading={cancel.isPending}
        onConfirm={() => cancel.mutate(a.id, { onSuccess: () => navigate(Routes.clients.tab(a.client.id, "forms")) })}
      />
    </>
  );
};

export default AssignmentPage;

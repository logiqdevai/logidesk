import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useEffect, useMemo, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Ban, Pencil, Save, Send, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/access/role-gate";
import { AdminOnlyAccess } from "@/config/constants/access/workspace-access";
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
  useOrgTimeZone,
} from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import type { AssignmentRequirement } from "@/features/assignments/interfaces/assignments.interfaces";
import type { ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";
import type { ApiError } from "@/lib/api-error";
import { Routes } from "@/routes/routes";
import { formatDate, formatDateTime, formatDeadline } from "@/lib/format";
import { FormRenderer } from "@/pages/shared/components/form-renderer";
import { ActivityTimeline } from "@/pages/shared/components/activity-timeline";
import { UploadDialog } from "@/pages/shared/components/upload-dialog";
import { ReminderDialog } from "@/pages/shared/components/reminder-dialog";
import { RejectDialog } from "@/pages/shared/components/review-dialogs";
import { DocumentSheet } from "@/pages/shared/components/document-sheet";
import { HelpTip } from "@/components/ui/help-tip";
import { ScheduleEditor } from "@/pages/shared/components/schedule-editor";
import { RequirementCard } from "./components/requirement-card";

/** Client form view: everything the client submitted for one assignment (read-only or edit). */
const AssignmentPage: FC = () => {
  const { t } = useTranslation("assignments");
  const { id } = useParams();
  const timeZone = useOrgTimeZone();
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
  if (assignment.isError || !a) return <div className="callout bad">{assignment.error?.message ?? t("page.notFound")}</div>;

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
      <nav className="crumbs" aria-label={t("page.breadcrumb")}>
        <Link to={Routes.clients.root}>{t("page.clients")}</Link>
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
            {editing && <StatusBadge tone="coral">{t("page.editingBadge")}</StatusBadge>}
            <span className="muted">
              {a.client.name}
              {a.client.company ? ` · ${a.client.company}` : ""} · {a.assigned_by ? t("page.assignedOnBy", { date: formatDate(a.assigned_at), name: a.assigned_by }) : t("page.assignedOn", { date: formatDate(a.assigned_at) })}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={save.isPending}>
                <X />
                {t("actions.discard")}
              </Button>
              <Button variant="outline" loading={save.isPending && !save.variables?.submit} onClick={() => onSave(false)}>
                <Save />
                {t("actions.saveChanges")}
              </Button>
              {a.response.status !== "SUBMITTED" && (
                <Button loading={save.isPending && !!save.variables?.submit} onClick={() => onSave(true)}>
                  {t("actions.saveAndSubmit")}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setRemind(true)} disabled={!!a.cancelled_at}>
                <Send />
                {t("actions.sendReminder")}
              </Button>
              {can(Permissions.DOCUMENTS_UPLOAD) && !a.cancelled_at && (
                <RoleGate {...AdminOnlyAccess}>
                  <Button variant="outline" onClick={() => setUpload("")}>
                    <Upload />
                    {t("actions.uploadOnBehalf")}
                  </Button>
                </RoleGate>
              )}
              {canEdit && (
                <Button onClick={() => setEditing(true)}>
                  <Pencil />
                  {t("actions.editAnswers")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {a.cancelled_at && <div className="callout warn mb-4">{t("page.cancelledNotice", { date: formatDate(a.cancelled_at) })}</div>}
      {editing && (
        <div className="callout mb-4">
          <Pencil className="h-4 w-4 shrink-0" />
          <span>{t("page.editingNotice")}</span>
        </div>
      )}

      <div className="gr main-side">
        <div className="flex min-w-0 flex-col gap-4">
          {(a.instructions || a.description || a.message) && (
            <div className="card pad">
              {a.description && <p>{a.description}</p>}
              {a.instructions && <p className="muted mt-1 whitespace-pre-line">{a.instructions}</p>}
              {a.message && <p className="mt-2 italic">{t("page.messageToClient", { message: a.message })}</p>}
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
                    setReqSchedule(r.reminder_override ?? { enabled: r.reminder?.enabled, start_days_before: r.reminder?.start_days_before, interval_count: r.reminder?.interval_count, interval_unit: r.reminder?.interval_unit, interval_weekday: r.reminder?.interval_weekday, send_time: r.reminder?.send_time, overdue_enabled: r.reminder?.overdue_enabled, overdue_interval_count: r.reminder?.overdue_interval_count, overdue_interval_unit: r.reminder?.overdue_interval_unit, overdue_interval_weekday: r.reminder?.overdue_interval_weekday, overdue_max_count: r.reminder?.overdue_max_count });
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
              <h3>{t("sidebar.completion")}</h3>
              <span className="num text-[32px]">{a.progress_percent}%</span>
            </div>
            <SegmentedProgress className="mt-3" large total={active.length || 1} ok={count("APPROVED")} review={count("UNDER_REVIEW", "SUBMITTED")} bad={count("REJECTED", "EXPIRED")} />
            <dl className="mt-4 divide-y divide-[var(--g-hairline)]">
              <SidebarRow label={t("sidebar.documents")}>
                {t("sidebar.documentsApproved", { done: a.requirements_completed, total: a.requirements_total })}
              </SidebarRow>
              <div className="grid grid-cols-2 gap-4 py-3">
                <SidebarRow label={t("sidebar.missing")} flush>{a.requirements_missing}</SidebarRow>
                <SidebarRow label={t("sidebar.expired")} flush>{a.requirements_expired}</SidebarRow>
              </div>
              <SidebarRow label={t("sidebar.answers")}>
                {a.response.status === "SUBMITTED"
                  ? t("sidebar.answersSubmitted", { date: formatDateTime(a.response.submitted_at) })
                  : a.response.last_saved_at
                    ? t("sidebar.answersDraft", { date: formatDateTime(a.response.last_saved_at) })
                    : t("sidebar.answersNotStarted")}
              </SidebarRow>
              <SidebarRow
                label={t("sidebar.deadline")}
                action={
                  canEdit && (
                    <button
                      className="link-btn rounded-md bg-[var(--g-surface-card)] px-3 py-1 text-[14px]"
                      onClick={() => {
                        setDeadline(a.deadline ?? "");
                        setDeadlineOpen(true);
                      }}
                    >
                      {t("actions.change")}
                    </button>
                  )
                }
              >
                {formatDeadline(a.deadline, timeZone)}
              </SidebarRow>
            </dl>
            {canEdit && (
              <Button variant="ghost" size="sm" className="mt-4 w-full bg-[var(--g-error-tint)] text-[var(--g-error-ink)] hover:bg-[#f0d0cb] hover:text-[var(--g-error-ink)]" onClick={() => setCancelling(true)}>
                <Ban />
                {t("actions.cancelAssignment")}
              </Button>
            )}
          </div>
          <Panel title={t("sidebar.recentChanges")}>
            <div className="px-5 py-2">
              <ActivityTimeline items={a.recent_changes ?? []} showClient={false} empty={t("sidebar.noChanges")} />
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
            <DialogDescription>{t("settingsDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="field">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="req-deadline">{t("settingsDialog.ownDeadline")}</Label>
                <HelpTip topic="deadline" />
              </div>
              <DateTimePicker id="req-deadline" timeZone={timeZone} value={reqDeadline} onChange={setReqDeadline} />
              <span className="hint">{t("settingsDialog.ownDeadlineHint", { date: formatDeadline(a.deadline, timeZone) })}</span>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="label">{t("settingsDialog.overrideSchedule")}</span>
              <Switch checked={reqOverride} onCheckedChange={setReqOverride} />
            </label>
            {reqOverride ? <ScheduleEditor value={reqSchedule} onChange={setReqSchedule} /> : <p className="caption">{t("settingsDialog.effective", { summary: settingsFor?.reminder?.summary })}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsFor(null)}>
              {t("actions.cancel")}
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
              {t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!notRequired} onOpenChange={(o) => !o && setNotRequired(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[24px] font-medium">{t("notRequiredDialog.title", { name: notRequired?.name })}</DialogTitle>
            <DialogDescription>{t("notRequiredDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="field">
            <Label htmlFor="nr-reason">{t("notRequiredDialog.reasonLabel")}</Label>
            <Textarea id="nr-reason" placeholder={t("notRequiredDialog.reasonPlaceholder")} rows={2} value={notRequiredReason} onChange={(e) => setNotRequiredReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotRequired(null)}>
              {t("actions.cancel")}
            </Button>
            <Button
              loading={updateReq.isPending}
              onClick={() =>
                notRequired &&
                updateReq.mutate({ id: a.id, requirementId: notRequired.id, not_required: true, not_required_reason: notRequiredReason || undefined }, { onSuccess: () => setNotRequired(null) })
              }
            >
              {t("notRequiredDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deadlineOpen} onOpenChange={setDeadlineOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deadlineDialog.title")}</DialogTitle>
            <DialogDescription>{t("deadlineDialog.description")}</DialogDescription>
          </DialogHeader>
          <DateTimePicker timeZone={timeZone} value={deadline} onChange={setDeadline} aria-label={t("deadlineDialog.ariaLabel")} />
          <DialogFooter>
            <Button variant="outline" onClick={() => updateAssignment.mutate({ id: a.id, deadline: null }, { onSuccess: () => setDeadlineOpen(false) })}>
              {t("deadlineDialog.remove")}
            </Button>
            <Button loading={updateAssignment.isPending} disabled={!deadline} onClick={() => updateAssignment.mutate({ id: a.id, deadline }, { onSuccess: () => setDeadlineOpen(false) })}>
              {t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog
        isOpen={cancelling}
        onClose={() => setCancelling(false)}
        variant="destructive"
        title={t("cancelDialog.title")}
        description={t("cancelDialog.description")}
        confirmText={t("cancelDialog.confirm")}
        isLoading={cancel.isPending}
        onConfirm={() => cancel.mutate(a.id, { onSuccess: () => navigate(Routes.clients.tab(a.client.id, "forms")) })}
      />
    </>
  );
};

export default AssignmentPage;

function SidebarRow({ label, action, flush, children }: { label: string; action?: React.ReactNode; flush?: boolean; children: React.ReactNode }) {
  return (
    <div className={flush ? "" : "py-3 first:pt-0 last:pb-0"}>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-[var(--g-muted)]">{label}</dt>
      <dd className="m-0 mt-1 flex items-center justify-between gap-3 text-[16px] text-[var(--g-ink)]">
        <span>{children}</span>
        {action}
      </dd>
    </div>
  );
}

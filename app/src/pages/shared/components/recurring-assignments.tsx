import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pause, Pencil, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/ui/page-elements";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { getRecurrenceStatusLabel } from "@/config/constants/dropdowns/documents/recurrence-status-form.options";
import type { RecurrenceInput, RecurrenceItem, RecurrenceStatus } from "@/features/assignments/interfaces/assignments.interfaces";
import { useEndRecurrence, useOrgTimeZone, usePauseRecurrence, useRecurrences, useResumeRecurrence, useUpdateRecurrence } from "@/features/workspace/hooks/use-workspace-data";
import { instantToZoned, formatDeadline } from "@/lib/format";
import { RecurrenceEditor } from "./recurrence-editor";
import { describeRecurrence, describeRecurrenceDeadline } from "../utils/recurrence.utils";

const STATUS_TONE: Record<RecurrenceStatus, BadgeTone> = { ACTIVE: "approved", PAUSED: "review", ENDED: "notreq" };

/** The schedule of a stored series as editor input (null columns become undefined). */
const toInput = (r: RecurrenceItem): RecurrenceInput => ({
  frequency: r.frequency,
  interval_count: r.interval_count,
  weekday: r.weekday ?? undefined,
  day_of_month: r.day_of_month ?? undefined,
  last_day_of_month: r.last_day_of_month || undefined,
  month_of_year: r.month_of_year ?? undefined,
  run_time: r.run_time,
  starts_on: r.starts_on ?? undefined,
  end_mode: r.end_mode,
  end_count: r.end_count ?? undefined,
  end_date: r.end_date ?? undefined,
  deadline_mode: r.deadline_mode,
  deadline_offset_days: r.deadline_offset_days ?? undefined,
  deadline_time: r.deadline_time ?? undefined,
  deadline_day: r.deadline_day ?? undefined,
  deadline_last_day: r.deadline_last_day || undefined,
  overlap_policy: r.overlap_policy,
});

const EditRecurrenceDialog: FC<{ item: RecurrenceItem | null; onClose: () => void }> = ({ item, onClose }) => {
  const { t } = useTranslation("recurrence");
  const { t: td } = useTranslation("documents");
  const timeZone = useOrgTimeZone();
  const today = instantToZoned(new Date(), timeZone).date;
  const update = useUpdateRecurrence();
  const [form, setForm] = useState<{ id: string; schedule: RecurrenceInput; message: string; notify: boolean } | null>(null);
  // Re-seed the form whenever a different series is opened.
  const current = item && form?.id === item.id ? form : item ? { id: item.id, schedule: toInput(item), message: item.message ?? "", notify: item.notify_client } : null;
  if (item && form?.id !== item.id && current) setForm(current);

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && !update.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="display text-[26px] font-medium">{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>
        {current && (
          <div className="flex flex-col gap-4">
            <RecurrenceEditor value={current.schedule} onChange={(schedule) => setForm({ ...current, schedule })} timeZone={timeZone} today={today} hideStart />
            <div className="field">
              <Label htmlFor="rec-msg">
                {t("edit.message")} <span className="soft">({td("assign.optional")})</span>
              </Label>
              <Textarea id="rec-msg" rows={2} value={current.message} onChange={(e) => setForm({ ...current, message: e.target.value })} />
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="label">{t("edit.notify")}</span>
              <Switch checked={current.notify} onCheckedChange={(notify) => setForm({ ...current, notify })} />
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            {td("common.cancel")}
          </Button>
          <Button
            loading={update.isPending}
            disabled={!current}
            onClick={() => current && update.mutate({ id: current.id, ...current.schedule, message: current.message || null, notify_client: current.notify }, { onSuccess: onClose })}
          >
            {t("edit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Recurring assignment series of one client, with edit / pause / resume / end actions. */
export const RecurringAssignments: FC<{ clientId: string; readOnly?: boolean }> = ({ clientId, readOnly = false }) => {
  const { t } = useTranslation("recurrence");
  const timeZone = useOrgTimeZone();
  const list = useRecurrences({ client_id: clientId, limit: 50 });
  const pause = usePauseRecurrence();
  const resume = useResumeRecurrence();
  const end = useEndRecurrence();
  const [editing, setEditing] = useState<RecurrenceItem | null>(null);
  const [ending, setEnding] = useState<RecurrenceItem | null>(null);

  const rows = (list.data?.data ?? []).filter((r) => r.status !== "ENDED" || r.occurrences_created > 0);
  if (list.isPending) return <TableSkeleton rows={2} />;
  if (!rows.length) return null;

  return (
    <section className="card mb-4">
      <div className="border-b p-4">
        <h2 className="label">{t("list.title")}</h2>
        <p className="caption">{t("list.description")}</p>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="list-row !items-start gap-3 !py-3">
          <div className="grow min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="cell-main">{r.forms.map((f) => f.name).join(", ")}</span>
              <StatusBadge tone={STATUS_TONE[r.status]}>{getRecurrenceStatusLabel(r.status)}</StatusBadge>
            </div>
            <p className="cell-sub">{describeRecurrence(r)}</p>
            <p className="cell-sub">{describeRecurrenceDeadline(r)}</p>
            <p className="caption mt-1">
              {r.status === "ACTIVE" && r.next_run_at && <>{t("list.next", { date: formatDeadline(r.next_run_at, timeZone) })} · </>}
              {r.status === "PAUSED" && <>{t("list.pausedHint")} · </>}
              {r.last_run_at && <>{t("list.last", { date: formatDeadline(r.last_run_at, timeZone) })} · </>}
              {t("list.createdCount", { count: r.occurrences_created })}
            </p>
          </div>
          {!readOnly && r.status !== "ENDED" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={t("list.edit")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(r)}>
                  <Pencil /> {t("list.edit")}
                </DropdownMenuItem>
                {r.status === "ACTIVE" ? (
                  <DropdownMenuItem onClick={() => pause.mutate(r.id)}>
                    <Pause /> {t("list.pause")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => resume.mutate(r.id)}>
                    <Play /> {t("list.resume")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEnding(r)}>
                  <Square /> {t("list.end")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
      <EditRecurrenceDialog item={editing} onClose={() => setEditing(null)} />
      <ConfirmationDialog
        isOpen={!!ending}
        onClose={() => setEnding(null)}
        onConfirm={() => {
          if (ending) end.mutate(ending.id);
          setEnding(null);
        }}
        title={t("list.endTitle")}
        description={t("list.endDescription")}
        confirmText={t("list.endConfirm")}
        cancelText={t("list.keep")}
        variant="destructive"
      />
    </section>
  );
};

import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { TimePicker } from "@/components/ui/time-picker";
import { RecurrenceFrequencyFormOptions } from "@/config/constants/dropdowns/documents/recurrence-frequency-form.options";
import { RecurrenceDeadlineModeFormOptions } from "@/config/constants/dropdowns/documents/recurrence-deadline-mode-form.options";
import { RecurrenceEndModeFormOptions } from "@/config/constants/dropdowns/documents/recurrence-end-mode-form.options";
import { RecurrenceOverlapFormOptions } from "@/config/constants/dropdowns/documents/recurrence-overlap-form.options";
import { getRecurrenceStartMonthOptions } from "@/config/constants/dropdowns/documents/recurrence-month-form.options";
import { RecurrenceWeekdayFormOptions } from "@/config/constants/dropdowns/documents/recurrence-weekday-form.options";
import { RecurrenceDayOfMonthFormOptions } from "@/config/constants/dropdowns/documents/recurrence-day-of-month-form.options";
import type { RecurrenceFrequency, RecurrenceInput } from "@/features/assignments/interfaces/assignments.interfaces";
import { useRecurrencePreview } from "@/features/workspace/hooks/use-workspace-data";
import { useDebounced } from "@/hooks/use-debounced";
import { formatDeadline } from "@/lib/format";
import { changeFrequency } from "../utils/recurrence.utils";

interface RecurrenceEditorProps {
  value: RecurrenceInput;
  onChange: (value: RecurrenceInput) => void;
  /** Organization time zone (times are entered and shown in it). */
  timeZone: string;
  /** Earliest selectable start date, `YYYY-MM-DD`. */
  today: string;
  /** Hide the "when does it start" choice (editing an existing series). */
  hideStart?: boolean;
}

const clamp = (raw: string, min: number, max: number): number | undefined => {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? undefined : Math.min(max, Math.max(min, n));
};
const dayId = (last?: boolean, day?: number) => (last ? "last" : day ? String(day) : "1");

/** Schedule editor for a recurring assignment: frequency, day/time, start/end, deadline rule and a live preview. */
export const RecurrenceEditor: FC<RecurrenceEditorProps> = ({ value, onChange, timeZone, today, hideStart = false }) => {
  const { t } = useTranslation("recurrence");
  const set = (patch: Partial<RecurrenceInput>) => onChange({ ...value, ...patch });
  const { frequency } = value;
  const weekly = frequency === "WEEKLY";
  const everyN = weekly || frequency === "MONTHLY";
  const deadlineMode = value.deadline_mode ?? "NONE";
  const endMode = value.end_mode ?? "NEVER";
  const startNow = value.start_now ?? true;
  const preview = useRecurrencePreview(useDebounced({ ...value, start_now: hideStart ? false : startNow, count: 4 }, 400));
  const offsetMin = deadlineMode === "END_OF_PERIOD" ? 0 : 1;

  const pickDeadlineMode = (mode: NonNullable<RecurrenceInput["deadline_mode"]>) =>
    set({
      deadline_mode: mode,
      deadline_offset_days: mode === "AFTER_ASSIGNMENT" ? value.deadline_offset_days || 7 : mode === "BEFORE_NEXT" ? value.deadline_offset_days || 1 : mode === "END_OF_PERIOD" ? (value.deadline_offset_days ?? 0) : undefined,
      deadline_time: mode === "NONE" ? undefined : (value.deadline_time ?? "17:00"),
      deadline_day: mode === "DAY_IN_PERIOD" ? (weekly ? 5 : 25) : undefined,
      deadline_last_day: undefined,
    });

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-3">
      <div className="form-grid">
        <div className="field">
          <Label>{t("editor.repeats")}</Label>
          <FilterSelect size="default" className="w-full" label={t("editor.repeats")} value={frequency} options={RecurrenceFrequencyFormOptions} onChange={(v) => onChange(changeFrequency(value, v as RecurrenceFrequency))} />
        </div>
        {everyN && (
          <div className="field">
            <Label htmlFor="rec-every">{t("editor.every")}</Label>
            <div className="flex items-center gap-2">
              <Input id="rec-every" type="number" inputMode="numeric" min={1} max={weekly ? 52 : 24} className="w-24" value={value.interval_count ?? 1} onChange={(e) => set({ interval_count: clamp(e.target.value, 1, weekly ? 52 : 24) ?? 1 })} />
              <span className="muted">{t(weekly ? "editor.unitWeeks" : "editor.unitMonths", { count: value.interval_count ?? 1 })}</span>
            </div>
          </div>
        )}
      </div>

      <div className="form-grid">
        {weekly && (
          <div className="field">
            <Label>{t("editor.weekday")}</Label>
            <FilterSelect size="default" className="w-full" label={t("editor.weekday")} value={String(value.weekday ?? 1)} options={RecurrenceWeekdayFormOptions} onChange={(v) => set({ weekday: Number(v) })} />
          </div>
        )}
        {(frequency === "QUARTERLY" || frequency === "SEMI_ANNUAL" || frequency === "YEARLY") && (
          <div className="field">
            <Label>{t(frequency === "YEARLY" ? "editor.month" : "editor.startMonth")}</Label>
            <FilterSelect
              size="default"
              className="w-full"
              label={t(frequency === "YEARLY" ? "editor.month" : "editor.startMonth")}
              value={String(value.month_of_year ?? 1)}
              options={getRecurrenceStartMonthOptions(frequency)}
              onChange={(v) => set({ month_of_year: Number(v) })}
            />
          </div>
        )}
        {!weekly && (
          <div className="field">
            <Label>{t("editor.dayOfMonth")}</Label>
            <FilterSelect
              size="default"
              className="w-full"
              label={t("editor.dayOfMonth")}
              value={dayId(value.last_day_of_month, value.day_of_month)}
              options={RecurrenceDayOfMonthFormOptions}
              onChange={(v) => set(v === "last" ? { last_day_of_month: true, day_of_month: undefined } : { last_day_of_month: false, day_of_month: Number(v) })}
            />
          </div>
        )}
        <div className="field">
          <Label>{t("editor.time")}</Label>
          <TimePicker value={value.run_time} onChange={(v) => set({ run_time: v })} aria-label={t("editor.time")} />
        </div>
      </div>
      {!weekly && (value.day_of_month ?? 0) > 28 && <p className="caption">{t("editor.shortMonthsHint")}</p>}

      {!hideStart && (
        <div className="field">
          <Label>{t("editor.start")}</Label>
          <RadioGroup value={startNow ? "now" : "date"} onValueChange={(v) => set({ start_now: v === "now", starts_on: v === "now" ? undefined : (value.starts_on ?? today) })}>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="now" />
              <span>{t("editor.startNow")}</span>
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="date" />
              <span>{t("editor.startOnDate")}</span>
            </label>
          </RadioGroup>
          {!startNow && <DatePicker className="mt-1" min={today} value={value.starts_on ?? today} onChange={(v) => set({ starts_on: v })} aria-label={t("editor.startDate")} />}
        </div>
      )}

      <div className="form-grid">
        <div className="field">
          <Label>{t("editor.end")}</Label>
          <FilterSelect size="default" className="w-full" label={t("editor.end")} value={endMode} options={RecurrenceEndModeFormOptions} onChange={(v) => set({ end_mode: v as RecurrenceInput["end_mode"] })} />
        </div>
        {endMode === "AFTER_COUNT" && (
          <div className="field">
            <Label htmlFor="rec-count">{t("editor.endCount")}</Label>
            <Input id="rec-count" type="number" inputMode="numeric" min={1} max={1000} value={value.end_count ?? ""} onChange={(e) => set({ end_count: clamp(e.target.value, 1, 1000) })} />
          </div>
        )}
        {endMode === "ON_DATE" && (
          <div className="field">
            <Label>{t("editor.endDate")}</Label>
            <DatePicker min={value.starts_on ?? today} value={value.end_date ?? ""} onChange={(v) => set({ end_date: v })} aria-label={t("editor.endDate")} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="field">
          <Label>{t("editor.deadline")}</Label>
          <FilterSelect size="default" className="w-full" label={t("editor.deadline")} value={deadlineMode} options={RecurrenceDeadlineModeFormOptions} onChange={(v) => pickDeadlineMode(v as NonNullable<RecurrenceInput["deadline_mode"]>)} />
        </div>
        {deadlineMode !== "NONE" && (
          <div className="form-grid">
            {(deadlineMode === "AFTER_ASSIGNMENT" || deadlineMode === "END_OF_PERIOD" || deadlineMode === "BEFORE_NEXT") && (
              <div className="field">
                <Label htmlFor="rec-offset">{t(deadlineMode === "AFTER_ASSIGNMENT" ? "editor.daysAfter" : deadlineMode === "END_OF_PERIOD" ? "editor.daysBeforeEnd" : "editor.daysBeforeNext")}</Label>
                <Input id="rec-offset" type="number" inputMode="numeric" min={offsetMin} max={366} value={value.deadline_offset_days ?? ""} onChange={(e) => set({ deadline_offset_days: clamp(e.target.value, offsetMin, 366) })} />
              </div>
            )}
            {deadlineMode === "DAY_IN_PERIOD" && weekly && (
              <div className="field">
                <Label>{t("editor.deadlineWeekday")}</Label>
                <FilterSelect size="default" className="w-full" label={t("editor.deadlineWeekday")} value={String(value.deadline_day ?? 5)} options={RecurrenceWeekdayFormOptions} onChange={(v) => set({ deadline_day: Number(v) })} />
              </div>
            )}
            {deadlineMode === "DAY_IN_PERIOD" && !weekly && (
              <div className="field">
                <Label>{t("editor.deadlineDay")}</Label>
                <FilterSelect
                  size="default"
                  className="w-full"
                  label={t("editor.deadlineDay")}
                  value={dayId(value.deadline_last_day, value.deadline_day)}
                  options={RecurrenceDayOfMonthFormOptions}
                  onChange={(v) => set(v === "last" ? { deadline_last_day: true, deadline_day: undefined } : { deadline_last_day: false, deadline_day: Number(v) })}
                />
              </div>
            )}
            <div className="field">
              <Label>{t("editor.deadlineTime")}</Label>
              <TimePicker value={value.deadline_time ?? "17:00"} onChange={(v) => set({ deadline_time: v })} aria-label={t("editor.deadlineTime")} />
            </div>
          </div>
        )}
        {deadlineMode !== "NONE" && <p className="caption">{t(`editor.deadlineHelp.${deadlineMode}`)}</p>}
      </div>

      <div className="field">
        <Label>{t("editor.overlap")}</Label>
        <FilterSelect size="default" className="w-full" label={t("editor.overlap")} value={value.overlap_policy ?? "CREATE_ANYWAY"} options={RecurrenceOverlapFormOptions} onChange={(v) => set({ overlap_policy: v as RecurrenceInput["overlap_policy"] })} />
        <p className="caption">{t("editor.overlapHelp")}</p>
      </div>

      <div className="rounded-md bg-muted/50 p-3">
        <p className="label mb-1">{t("editor.preview")}</p>
        {preview.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {preview.error.message}
          </p>
        ) : !preview.data ? (
          <Skeleton className="h-16" />
        ) : !preview.data.occurrences.length ? (
          <p className="muted">{t("editor.previewEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {preview.data.occurrences.map((o, i) => (
              <li key={o.run_at ?? i} className="text-sm">
                <span className="cell-main">{i === 0 && !hideStart && startNow ? t("editor.previewNow") : formatDeadline(o.run_at, timeZone)}</span>
                <span className="muted"> · {o.deadline_at ? t("editor.previewDue", { deadline: formatDeadline(o.deadline_at, timeZone) }) : t("editor.previewNoDeadline")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

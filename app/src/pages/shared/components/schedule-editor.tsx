import type { FC } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FilterSelect } from "@/components/ui/filter-select";
import { IntervalUnitFormOptions } from "@/config/constants/dropdowns/documents/interval-unit-form.options";
import type { IntervalUnit, ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";

/** Plain-language summary, e.g. "Starts 14 days before the deadline, then every 3 days at 09:00". */
export function describeSchedule(s: ReminderScheduleInput, fallback?: ReminderScheduleInput): string {
  const t = i18n.getFixedT(null, "documents");
  const v = { ...fallback, ...Object.fromEntries(Object.entries(s).filter(([, x]) => x !== null && x !== undefined)) } as ReminderScheduleInput;
  if (v.enabled === false) return t("schedule.off");
  const freq = (count?: number | null, unit?: IntervalUnit | null) => {
    return t(unit === "WEEKS" ? "schedule.everyWeeks" : "schedule.everyDays", { count: count ?? 1 });
  };
  const start = v.start_days_before === 0 ? t("schedule.startsOnDeadline") : t("schedule.startsBefore", { count: v.start_days_before ?? 7 });
  let text = t("schedule.summary", { start, freq: freq(v.interval_count, v.interval_unit), time: v.send_time ?? "09:00" });
  if (v.overdue_enabled) {
    text += t("schedule.afterDeadline", { freq: freq(v.overdue_interval_count, v.overdue_interval_unit) });
    if (v.overdue_max_count) text += t("schedule.max", { count: v.overdue_max_count });
  }
  return text;
}

const num = (v: string) => (v === "" ? null : Math.max(0, parseInt(v, 10) || 0));

/** Editor for one reminder schedule level (organization, form, document or assignment). */
export const ScheduleEditor: FC<{ value: ReminderScheduleInput; onChange: (v: ReminderScheduleInput) => void; showSummary?: boolean; compact?: boolean }> = ({
  value,
  onChange,
  showSummary = true,
}) => {
  const { t } = useTranslation("documents");
  const set = (patch: Partial<ReminderScheduleInput>) => onChange({ ...value, ...patch });
  const enabled = value.enabled !== false;
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-[var(--g-surface-soft)] p-4">
      <label className="flex items-center justify-between gap-3">
        <span className="label">{t("schedule.automatic")}</span>
        <Switch checked={enabled} onCheckedChange={(v) => set({ enabled: v })} aria-label={t("schedule.automatic")} />
      </label>
      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="field">
              <Label htmlFor="sch-start">{t("schedule.startDaysBefore")}</Label>
              <Input id="sch-start" placeholder={t("schedule.exampleSeven")} type="number" min={0} value={value.start_days_before ?? ""} onChange={(e) => set({ start_days_before: num(e.target.value) })} />
            </div>
            <div className="field">
              <Label htmlFor="sch-every">{t("schedule.repeatEvery")}</Label>
              <Input id="sch-every" placeholder={t("schedule.exampleThree")} type="number" min={1} value={value.interval_count ?? ""} onChange={(e) => set({ interval_count: num(e.target.value) || 1 })} />
            </div>
            <div className="field">
              <Label>{t("schedule.unit")}</Label>
              <FilterSelect label={t("schedule.intervalUnit")} size="default" className="w-full" value={value.interval_unit ?? "DAYS"} onChange={(v) => set({ interval_unit: v as IntervalUnit })} options={IntervalUnitFormOptions} />
            </div>
            <div className="field">
              <Label htmlFor="sch-time">{t("schedule.sendTime")}</Label>
              <Input id="sch-time" type="time" value={value.send_time ?? "09:00"} onChange={(e) => set({ send_time: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="label">{t("schedule.keepReminding")}</span>
            <Switch checked={!!value.overdue_enabled} onCheckedChange={(v) => set({ overdue_enabled: v })} aria-label={t("schedule.overdueReminders")} />
          </label>
          {value.overdue_enabled && (
            <div className="grid grid-cols-3 gap-3">
              <div className="field">
                <Label htmlFor="sch-oevery">{t("schedule.every")}</Label>
                <Input id="sch-oevery" placeholder={t("schedule.exampleOne")} type="number" min={1} value={value.overdue_interval_count ?? ""} onChange={(e) => set({ overdue_interval_count: num(e.target.value) || 1 })} />
              </div>
              <div className="field">
                <Label>{t("schedule.unit")}</Label>
                <FilterSelect label={t("schedule.overdueUnit")} size="default" className="w-full" value={value.overdue_interval_unit ?? "WEEKS"} onChange={(v) => set({ overdue_interval_unit: v as IntervalUnit })} options={IntervalUnitFormOptions} />
              </div>
              <div className="field">
                <Label htmlFor="sch-omax">{t("schedule.maxReminders")}</Label>
                <Input id="sch-omax" type="number" min={0} placeholder={t("schedule.noLimit")} value={value.overdue_max_count ?? ""} onChange={(e) => set({ overdue_max_count: num(e.target.value) })} />
              </div>
            </div>
          )}
        </>
      )}
      {showSummary && <p className="caption">{describeSchedule(value)}</p>}
    </div>
  );
};

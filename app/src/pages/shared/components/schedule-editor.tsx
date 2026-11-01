import { useCallback, type FC } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HelpTip } from "@/components/ui/help-tip";
import { FilterSelect } from "@/components/ui/filter-select";
import { IntervalUnitFormOptions } from "@/config/constants/dropdowns/documents/interval-unit-form.options";
import type { IntervalUnit, ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";
import { useNotificationSettings } from "@/features/workspace/hooks/use-workspace-data";

const BUILT_IN_DEFAULT: ReminderScheduleInput = { enabled: true, start_days_before: 7, interval_count: 3, interval_unit: "DAYS", interval_weekday: 1, send_time: "09:00", overdue_enabled: true, overdue_interval_count: 1, overdue_interval_unit: "WEEKS", overdue_interval_weekday: 1, overdue_max_count: 4 };

/** Returns a function that builds the starting values for a new override: the currently inherited organization schedule. */
export function useScheduleSeed() {
  const settings = useNotificationSettings();
  const org = settings.data?.default_reminder_schedule;
  return useCallback((): ReminderScheduleInput => {
    if (!org) return { ...BUILT_IN_DEFAULT };
    const { summary: _summary, ...rest } = org;
    return { ...BUILT_IN_DEFAULT, ...rest, enabled: true };
  }, [org]);
}

/** Plain-language summary, e.g. "Starts 14 days before the deadline, then every 3 days at 09:00". */
export function describeSchedule(s: ReminderScheduleInput, fallback?: ReminderScheduleInput): string {
  const t = i18n.getFixedT(null, "documents");
  const v = { ...fallback, ...Object.fromEntries(Object.entries(s).filter(([, x]) => x !== null && x !== undefined)) } as ReminderScheduleInput;
  if (v.enabled === false) return t("schedule.off");
  const freq = (count?: number | null, unit?: IntervalUnit | null, weekday?: number | null) => {
    if (unit === "WEEKS" && weekday) return t("schedule.everyWeeksOn", { count: count ?? 1, day: t(`schedule.weekdays.${weekday}`) });
    return t(unit === "WEEKS" ? "schedule.everyWeeks" : unit === "HOURS" ? "schedule.everyHours" : "schedule.everyDays", { count: count ?? 1 });
  };
  const start = v.start_days_before === 0 ? t("schedule.startsOnDeadline") : t("schedule.startsBefore", { count: v.start_days_before ?? 7 });
  const hourlyMain = v.interval_unit === "HOURS";
  let text = hourlyMain ? t("schedule.summaryHourly", { start, freq: freq(v.interval_count, v.interval_unit) }) : t("schedule.summary", { start, freq: freq(v.interval_count, v.interval_unit, v.interval_weekday ?? 1), time: v.send_time ?? "09:00" });
  if (!v.interval_unit || v.interval_unit === "DAYS") text += t("schedule.andDeadlineDay");
  if (v.overdue_enabled) {
    text += t("schedule.afterDeadline", { freq: freq(v.overdue_interval_count, v.overdue_interval_unit, v.overdue_interval_weekday ?? 1) });
    if (v.overdue_max_count && v.overdue_max_count > 0) text += t("schedule.max", { count: v.overdue_max_count });
  }
  return text;
}

/** Empty stays empty (inherit); otherwise clamped to [min, max]. */
const num = (v: string, min: number, max: number) => {
  if (v.trim() === "") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : Math.min(max, Math.max(min, n));
};
const maxInterval = (unit?: IntervalUnit | null) => (unit === "HOURS" ? 720 : 52);
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/** Editor for one reminder schedule level (organization, form, document or assignment). */
export const ScheduleEditor: FC<{ value: ReminderScheduleInput; onChange: (v: ReminderScheduleInput) => void; showSummary?: boolean; compact?: boolean; noDeadline?: boolean; hideToggle?: boolean }> = ({
  value,
  onChange,
  showSummary = true,
  noDeadline = false,
  hideToggle = false,
}) => {
  const { t } = useTranslation("documents");
  const set = (patch: Partial<ReminderScheduleInput>) => onChange({ ...value, ...patch });
  const enabled = value.enabled !== false;
  const weekdayOptions = WEEKDAYS.map((n) => ({ id: String(n), label: t(`schedule.weekdays.${n}`) }));
  const hourlyMain = value.interval_unit === "HOURS";
  const showSendTime = !hourlyMain || (!noDeadline && !!value.overdue_enabled && value.overdue_interval_unit !== "HOURS");
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-[var(--g-surface-soft)] p-4">
      {!hideToggle && (
        <label className="flex items-center justify-between gap-3">
          <span className="label">{t("schedule.automatic")}</span>
          <Switch checked={enabled} onCheckedChange={(v) => set({ enabled: v })} aria-label={t("schedule.automatic")} />
        </label>
      )}
      {enabled && (
        <>
          <div className="flex flex-col gap-3">
            {!noDeadline && (
            <div className="field min-w-0">
              <Label htmlFor="sch-start">{t("schedule.startDaysBefore")}</Label>
              <Input id="sch-start" placeholder={t("schedule.exampleSeven")} type="number" className="w-full min-w-0" min={0} max={365} value={value.start_days_before ?? ""} onChange={(e) => set({ start_days_before: num(e.target.value, 0, 365) })} />
              <HelpTip topic="startDays" />
            </div>
            )}
            <div className="field min-w-0">
              <Label htmlFor="sch-every">{t("schedule.repeatEvery")}</Label>
              <Input id="sch-every" placeholder={t("schedule.exampleThree")} type="number" className="w-full min-w-0" min={1} max={maxInterval(value.interval_unit)} value={value.interval_count ?? ""} onChange={(e) => set({ interval_count: num(e.target.value, 1, maxInterval(value.interval_unit)) })} />
              <HelpTip topic="repeatEvery" />
            </div>
            <div className="field min-w-0">
              <Label>{t("schedule.unit")}</Label>
              <FilterSelect label={t("schedule.intervalUnit")} size="default" className="w-full min-w-0" value={value.interval_unit ?? "DAYS"} onChange={(v) => set({ interval_unit: v as IntervalUnit, ...(v === "WEEKS" && !value.interval_weekday ? { interval_weekday: 1 } : {}), interval_count: value.interval_count ? Math.min(value.interval_count, maxInterval(v as IntervalUnit)) : value.interval_count })} options={IntervalUnitFormOptions} />
              <HelpTip topic="unit" />
            </div>
            {value.interval_unit === "WEEKS" && (
              <div className="field min-w-0">
                <Label>{t("schedule.weekday")}</Label>
                <FilterSelect label={t("schedule.weekday")} size="default" className="w-full min-w-0" value={String(value.interval_weekday ?? 1)} onChange={(v) => set({ interval_weekday: Number(v) })} options={weekdayOptions} />
                <HelpTip topic="weekday" />
              </div>
            )}
            {showSendTime && (
            <div className="field min-w-0">
              <Label htmlFor="sch-time">{t("schedule.sendTime")}</Label>
              <Input id="sch-time" type="time" className="w-full min-w-0" value={value.send_time ?? "09:00"} onChange={(e) => set({ send_time: e.target.value })} />
              <HelpTip topic="sendTime" />
            </div>
            )}
          </div>
          {!noDeadline && (
          <>
          <label className="flex items-center justify-between gap-3">
            <span className="label">{t("schedule.keepReminding")}</span>
            <Switch checked={!!value.overdue_enabled} onCheckedChange={(v) => set({ overdue_enabled: v })} aria-label={t("schedule.overdueReminders")} />
          </label>
          <HelpTip topic="afterDeadline" className="-mt-2" />
          </>
          )}
          {!noDeadline && value.overdue_enabled && (
            <div className="flex flex-col gap-3">
              <div className="field min-w-0">
                <Label htmlFor="sch-oevery">{t("schedule.every")}</Label>
                <Input id="sch-oevery" placeholder={t("schedule.exampleOne")} type="number" className="w-full min-w-0" min={1} max={maxInterval(value.overdue_interval_unit)} value={value.overdue_interval_count ?? ""} onChange={(e) => set({ overdue_interval_count: num(e.target.value, 1, maxInterval(value.overdue_interval_unit)) })} />
                <HelpTip topic="overdueEvery" />
              </div>
              <div className="field min-w-0">
                <Label>{t("schedule.unit")}</Label>
                <FilterSelect label={t("schedule.overdueUnit")} size="default" className="w-full min-w-0" value={value.overdue_interval_unit ?? "WEEKS"} onChange={(v) => set({ overdue_interval_unit: v as IntervalUnit, ...(v === "WEEKS" && !value.overdue_interval_weekday ? { overdue_interval_weekday: 1 } : {}), overdue_interval_count: value.overdue_interval_count ? Math.min(value.overdue_interval_count, maxInterval(v as IntervalUnit)) : value.overdue_interval_count })} options={IntervalUnitFormOptions} />
              </div>
              {value.overdue_interval_unit === "WEEKS" && (
                <div className="field min-w-0">
                  <Label>{t("schedule.weekday")}</Label>
                  <FilterSelect label={t("schedule.weekday")} size="default" className="w-full min-w-0" value={String(value.overdue_interval_weekday ?? 1)} onChange={(v) => set({ overdue_interval_weekday: Number(v) })} options={weekdayOptions} />
                  <HelpTip topic="weekday" />
                </div>
              )}
              <div className="field min-w-0">
                <Label htmlFor="sch-omax">{t("schedule.maxReminders")}</Label>
                <Input id="sch-omax" type="number" className="w-full min-w-0" min={0} max={100} placeholder={t("schedule.noLimit")} value={value.overdue_max_count ?? ""} onChange={(e) => set({ overdue_max_count: num(e.target.value, 0, 100) })} />
                <HelpTip topic="maxReminders" />
              </div>
            </div>
          )}
        </>
      )}
      {showSummary && !noDeadline && <p className="caption">{describeSchedule(value)}</p>}
    </div>
  );
};

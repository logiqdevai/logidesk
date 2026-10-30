import type { FC } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FilterSelect } from "@/components/ui/filter-select";
import { IntervalUnitFormOptions } from "@/config/constants/dropdowns/documents/interval-unit-form.options";
import type { IntervalUnit, ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";

/** Plain-language summary, e.g. "Starts 14 days before the deadline, then every 3 days at 09:00". */
export function describeSchedule(s: ReminderScheduleInput, fallback?: ReminderScheduleInput): string {
  const v = { ...fallback, ...Object.fromEntries(Object.entries(s).filter(([, x]) => x !== null && x !== undefined)) } as ReminderScheduleInput;
  if (v.enabled === false) return "Automatic reminders are off";
  const freq = (count?: number | null, unit?: IntervalUnit | null) => {
    const word = unit === "WEEKS" ? "week" : "day";
    return (count ?? 1) === 1 ? `every ${word}` : `every ${count} ${word}s`;
  };
  const start = v.start_days_before === 0 ? "Starts on the deadline day" : `Starts ${v.start_days_before ?? 7} days before the deadline`;
  let text = `${start}, then ${freq(v.interval_count, v.interval_unit)} at ${v.send_time ?? "09:00"}`;
  if (v.overdue_enabled) {
    text += `; after the deadline ${freq(v.overdue_interval_count, v.overdue_interval_unit)}`;
    if (v.overdue_max_count) text += ` (max ${v.overdue_max_count})`;
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
  const set = (patch: Partial<ReminderScheduleInput>) => onChange({ ...value, ...patch });
  const enabled = value.enabled !== false;
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-[var(--g-surface-soft)] p-4">
      <label className="flex items-center justify-between gap-3">
        <span className="label">Automatic reminders</span>
        <Switch checked={enabled} onCheckedChange={(v) => set({ enabled: v })} aria-label="Automatic reminders" />
      </label>
      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="field">
              <Label htmlFor="sch-start">Start (days before)</Label>
              <Input id="sch-start" placeholder="e.g. 7" type="number" min={0} value={value.start_days_before ?? ""} onChange={(e) => set({ start_days_before: num(e.target.value) })} />
            </div>
            <div className="field">
              <Label htmlFor="sch-every">Repeat every</Label>
              <Input id="sch-every" placeholder="e.g. 3" type="number" min={1} value={value.interval_count ?? ""} onChange={(e) => set({ interval_count: num(e.target.value) || 1 })} />
            </div>
            <div className="field">
              <Label>Unit</Label>
              <FilterSelect label="Interval unit" size="default" className="w-full" value={value.interval_unit ?? "DAYS"} onChange={(v) => set({ interval_unit: v as IntervalUnit })} options={IntervalUnitFormOptions} />
            </div>
            <div className="field">
              <Label htmlFor="sch-time">Send time</Label>
              <Input id="sch-time" type="time" value={value.send_time ?? "09:00"} onChange={(e) => set({ send_time: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="label">Keep reminding after the deadline</span>
            <Switch checked={!!value.overdue_enabled} onCheckedChange={(v) => set({ overdue_enabled: v })} aria-label="Overdue reminders" />
          </label>
          {value.overdue_enabled && (
            <div className="grid grid-cols-3 gap-3">
              <div className="field">
                <Label htmlFor="sch-oevery">Every</Label>
                <Input id="sch-oevery" placeholder="e.g. 1" type="number" min={1} value={value.overdue_interval_count ?? ""} onChange={(e) => set({ overdue_interval_count: num(e.target.value) || 1 })} />
              </div>
              <div className="field">
                <Label>Unit</Label>
                <FilterSelect label="Overdue unit" size="default" className="w-full" value={value.overdue_interval_unit ?? "WEEKS"} onChange={(v) => set({ overdue_interval_unit: v as IntervalUnit })} options={IntervalUnitFormOptions} />
              </div>
              <div className="field">
                <Label htmlFor="sch-omax">Max reminders</Label>
                <Input id="sch-omax" type="number" min={0} placeholder="No limit" value={value.overdue_max_count ?? ""} onChange={(e) => set({ overdue_max_count: num(e.target.value) })} />
              </div>
            </div>
          )}
        </>
      )}
      {showSummary && <p className="caption">{describeSchedule(value)}</p>}
    </div>
  );
};

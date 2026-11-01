import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimePickerProps {
  /** 24-hour `HH:mm`, or empty. */
  value?: string | null;
  onChange: (value: string) => void;
  /** Minute granularity of the list (default 5). A value off the grid is still shown and selectable. */
  minuteStep?: number;
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));

const parse = (value?: string | null) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  return m ? { h: pad(Number(m[1])), m: m[2] } : null;
};

/** Time picker made of two shadcn dropdowns (hour, minute) that reads and writes 24-hour `HH:mm` strings. */
export function TimePicker({ value, onChange, minuteStep = 5, id, className, disabled, "aria-label": ariaLabel }: TimePickerProps) {
  const { t } = useTranslation("ui");
  const parsed = parse(value);
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep));
  if (parsed && !minutes.includes(parsed.m)) minutes.push(parsed.m), minutes.sort();

  return (
    <div className={cn("flex items-center gap-1.5", className)} role="group" aria-label={ariaLabel}>
      <Clock className="size-4 shrink-0 opacity-60" />
      <Select value={parsed?.h} disabled={disabled} onValueChange={(h) => onChange(`${h}:${parsed?.m ?? "00"}`)}>
        <SelectTrigger id={id} className="h-10 min-w-0 flex-1 tabular-nums" aria-label={t("timePicker.hour")}>
          <SelectValue placeholder={t("timePicker.hourShort")} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {HOURS.map((h) => (
            <SelectItem key={h} value={h} className="tabular-nums">
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="opacity-60">:</span>
      <Select value={parsed?.m} disabled={disabled} onValueChange={(m) => onChange(`${parsed?.h ?? "09"}:${m}`)}>
        <SelectTrigger className="h-10 min-w-0 flex-1 tabular-nums" aria-label={t("timePicker.minute")}>
          <SelectValue placeholder={t("timePicker.minuteShort")} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {minutes.map((m) => (
            <SelectItem key={m} value={m} className="tabular-nums">
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

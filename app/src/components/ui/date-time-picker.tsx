import { useState } from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { DEFAULT_TIME_ZONE, instantToZoned, zonedToInstant } from "@/lib/format";

interface DateTimePickerProps {
  /** ISO instant (e.g. `2026-12-01T15:00:00.000Z`), or empty. */
  value?: string | null;
  /** Emits an ISO instant, or "" when cleared. */
  onChange: (value: string) => void;
  /** IANA zone the date and time are entered in (the organization's time zone). */
  timeZone?: string;
  /** Earliest selectable date, `YYYY-MM-DD` in `timeZone`. */
  min?: string;
  /** Time applied when a date is picked before any time was entered. */
  defaultTime?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Date + time picker that reads and writes UTC instants while showing wall-clock values in `timeZone`. */
export function DateTimePicker({ value, onChange, timeZone = DEFAULT_TIME_ZONE, min, defaultTime = "17:00", id, className, disabled, "aria-label": ariaLabel }: DateTimePickerProps) {
  const { t } = useTranslation("ui");
  const zoned = value ? instantToZoned(value, timeZone) : null;
  const [draftTime, setDraftTime] = useState(defaultTime);
  const time = zoned?.time ?? draftTime;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DatePicker
        id={id}
        className="min-w-0 flex-1"
        min={min}
        value={zoned?.date ?? ""}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(date) => onChange(date ? zonedToInstant(date, time, timeZone) : "")}
      />
      <div className="relative w-36 shrink-0">
        <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
        <Input
          type="time"
          className="h-10 pl-9 pr-3 [&::-webkit-calendar-picker-indicator]:hidden"
          value={time}
          disabled={disabled}
          aria-label={t("dateTimePicker.time")}
          onChange={(e) => {
            const next = e.target.value;
            if (!next) return;
            setDraftTime(next);
            if (zoned) onChange(zonedToInstant(zoned.date, next, timeZone));
          }}
        />
      </div>
    </div>
  );
}

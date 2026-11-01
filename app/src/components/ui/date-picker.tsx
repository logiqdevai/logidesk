import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateLocale } from "@/i18n/locale";

interface DatePickerProps {
  /** ISO date string (`YYYY-MM-DD`), or empty. */
  value?: string | null;
  onChange: (value: string) => void;
  /** Earliest selectable date, `YYYY-MM-DD`. */
  min?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const parse = (value?: string | null) => {
  if (!value) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
};

/** shadcn date picker (Popover + Calendar) that reads and writes `YYYY-MM-DD` strings like a native date input. */
export function DatePicker({ value, onChange, min, placeholder, id, className, disabled, "aria-label": ariaLabel }: DatePickerProps) {
  const { t } = useTranslation("ui");
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const minDate = parse(min);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" disabled={disabled} aria-label={ariaLabel} className={cn("h-10 w-full justify-start px-3 font-normal", !selected && "text-muted-foreground", className)}>
          <CalendarIcon className="size-4 opacity-60" />
          {selected ? format(selected, "dd MMM yyyy", { locale: dateLocale() }) : (placeholder ?? t("datePicker.placeholder"))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={dateLocale()}
          selected={selected}
          defaultMonth={selected ?? minDate}
          captionLayout="dropdown"
          startMonth={minDate ?? new Date(Math.min(1950, selected?.getFullYear() ?? 1950), 0)}
          endMonth={new Date(Math.max(new Date().getFullYear() + 20, selected?.getFullYear() ?? 0), 11)}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(d) => {
            onChange(d ? format(d, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          autoFocus
        />
        {selected && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {t("datePicker.clear")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

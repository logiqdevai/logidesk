import type { FC } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ id: string; label: string }>;
  label: string;
  placeholder?: string;
  className?: string;
  size?: "sm" | "default";
  disabled?: boolean;
}

/** Toolbar / form select built on shadcn Select (accessible name via aria-label). */
export const FilterSelect: FC<FilterSelectProps> = ({ value, onChange, options, label, placeholder, className, size = "sm", disabled }) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger aria-label={label} className={cn(size === "sm" ? "h-8 text-[13px]" : "h-10", "bg-background w-auto min-w-[150px]", className)}>
      <SelectValue placeholder={placeholder ?? label} />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o.id} value={o.id}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

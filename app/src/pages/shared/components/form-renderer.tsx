import { DatePicker } from "@/components/ui/date-picker";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FilterSelect } from "@/components/ui/filter-select";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { VALUE_FIELD_TYPES, type FormDefinition, type FormField } from "@/features/forms/interfaces/forms.interfaces";

const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

/** Mirrors the API's conditional-visibility evaluation (the API re-validates on save). */
export function isFieldVisible(field: FormField, answers: Record<string, unknown>, definition: FormDefinition, depth = 0): boolean {
  const rule = field.visibility;
  if (!rule) return true;
  if (depth < 10) {
    const parent = definition.sections.flatMap((s) => s.fields).find((f) => f.id === rule.field_id);
    if (parent && !isFieldVisible(parent, answers, definition, depth + 1)) return false;
  }
  const value = answers[rule.field_id];
  const eq = (a: unknown, b: unknown) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();
  switch (rule.operator) {
    case "answered":
      return !isEmpty(value);
    case "not_answered":
      return isEmpty(value);
    case "equals":
      return Array.isArray(value) ? value.some((v) => eq(v, rule.value)) : eq(value, rule.value);
    case "not_equals":
      return Array.isArray(value) ? !value.some((v) => eq(v, rule.value)) : !eq(value, rule.value);
    case "contains":
      return Array.isArray(value) ? value.some((v) => eq(v, rule.value)) : String(value ?? "").toLowerCase().includes(String(rule.value ?? "").toLowerCase());
    default:
      return true;
  }
}

/** Required visible questions without an answer (client-side check before submitting). */
export function missingRequired(definition: FormDefinition, answers: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of definition.sections.flatMap((s) => s.fields)) {
    if (VALUE_FIELD_TYPES.includes(f.type) && f.required && isFieldVisible(f, answers, definition) && isEmpty(answers[f.id])) errors[f.id] = i18n.t("forms:renderer.required");
  }
  return errors;
}

export function displayValue(field: FormField, value: unknown): string {
  if (isEmpty(value)) return "—";
  if (field.type === "YES_NO") return value === true || value === "true" ? i18n.t("forms:renderer.yes") : i18n.t("forms:renderer.no");
  if (field.type === "CHECKBOXES" && Array.isArray(value)) return value.join(", ");
  if (field.type === "DATE") return formatDate(String(value));
  return String(value);
}

interface FieldInputProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

const FieldInput: FC<FieldInputProps> = ({ field, value, onChange, error, disabled }) => {
  const { t } = useTranslation("forms");
  const id = `fld-${field.id}`;
  const common = { id, disabled, "aria-invalid": !!error, "aria-describedby": field.help ? `${id}-help` : undefined };
  switch (field.type) {
    case "LONG_TEXT":
      return <Textarea {...common} rows={4} placeholder={field.placeholder ?? ""} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "NUMBER":
      return <Input {...common} placeholder={field.placeholder ?? t("renderer.enterNumber")} type="number" inputMode="decimal" className="max-w-xs" value={(value as string | number) ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
    case "EMAIL":
      return <Input {...common} placeholder={field.placeholder ?? "name@example.com"} type="email" className="max-w-md" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "PHONE":
      return <Input {...common} placeholder={field.placeholder ?? t("renderer.phoneExample")} type="tel" className="max-w-xs" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "DATE":
      return <DatePicker id={common.id} disabled={common.disabled} className="max-w-xs" value={(value as string) ?? ""} onChange={(v) => onChange(v || null)} />;
    case "DROPDOWN":
      return (
        <FilterSelect
          label={field.label}
          size="default"
          className="w-full max-w-md"
          disabled={disabled}
          placeholder={t("renderer.chooseOption")}
          value={(value as string) ?? ""}
          onChange={onChange}
          options={(field.options ?? []).map((o) => ({ id: o, label: o }))}
        />
      );
    case "MULTIPLE_CHOICE":
      return (
        <RadioGroup value={(value as string) ?? ""} onValueChange={onChange} disabled={disabled} aria-label={field.label}>
          {(field.options ?? []).map((o, i) => (
            <label key={o} className="flex items-center gap-2">
              <RadioGroupItem value={o} id={`${id}-${i}`} />
              {o}
            </label>
          ))}
        </RadioGroup>
      );
    case "CHECKBOXES": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-col gap-2" role="group" aria-label={field.label}>
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2">
              <Checkbox checked={list.includes(o)} disabled={disabled} onCheckedChange={(c) => onChange(c ? [...list, o] : list.filter((x) => x !== o))} />
              {o}
            </label>
          ))}
        </div>
      );
    }
    case "YES_NO":
      return (
        <RadioGroup
          className="flex gap-6"
          value={value === true ? "yes" : value === false ? "no" : ""}
          onValueChange={(v) => onChange(v === "yes")}
          disabled={disabled}
          aria-label={field.label}
        >
          <label className="flex items-center gap-2">
            <RadioGroupItem value="yes" /> {t("renderer.yes")}
          </label>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="no" /> {t("renderer.no")}
          </label>
        </RadioGroup>
      );
    default:
      return <Input {...common} placeholder={field.placeholder ?? ""} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
};

interface FormRendererProps {
  definition: FormDefinition;
  answers: Record<string, unknown>;
  onChange?: (fieldId: string, value: unknown) => void;
  readOnly?: boolean;
  errors?: Record<string, string>;
  /** Renders a FILE_UPLOAD field (requirement card). Omit to skip file fields. */
  renderFile?: (field: FormField) => ReactNode;
  disabled?: boolean;
}

/** Renders a form version section by section, honouring conditional visibility. */
export const FormRenderer: FC<FormRendererProps> = ({ definition, answers, onChange, readOnly, errors = {}, renderFile, disabled }) => {
  const { t } = useTranslation("forms");
  return (
  <div className="flex flex-col gap-4">
    {definition.sections.map((section) => {
      const fields = section.fields.filter((f) => isFieldVisible(f, answers, definition) && (f.type !== "FILE_UPLOAD" || renderFile));
      if (!fields.length && !section.title) return null;
      return (
        <section key={section.id} className="card">
          {(section.title || section.description) && (
            <div className="section-title flex-col !items-start">
              <span>{section.title}</span>
              {section.description && <span className="caption font-normal">{section.description}</span>}
            </div>
          )}
          <div className="flex flex-col">
            {fields.length === 0 && <p className="muted px-5 py-4">{t("renderer.noQuestions")}</p>}
            {fields.map((field) => {
              if (field.type === "HEADING") return <h3 key={field.id} className="display px-5 pt-5 text-[22px]">{field.label}</h3>;
              if (field.type === "DESCRIPTION") return <p key={field.id} className="muted whitespace-pre-line px-5 pt-3">{field.label || field.help}</p>;
              if (field.type === "DIVIDER") return <hr key={field.id} className="mx-5 my-3 border-[var(--g-hairline)]" />;
              if (field.type === "FILE_UPLOAD") return <div key={field.id}>{renderFile?.(field)}</div>;
              const error = errors[field.id];
              return (
                <div key={field.id} className={cn("field border-b border-[var(--g-hairline-soft)] px-5 py-4 last:border-b-0", error && "bg-[var(--g-error-tint)]/40")}>
                  <Label htmlFor={`fld-${field.id}`} className="text-[14px]">
                    {field.label}
                    {field.required && <span className="ml-0.5 text-[var(--g-error)]">*</span>}
                  </Label>
                  {field.help && (
                    <span id={`fld-${field.id}-help`} className="hint">
                      {field.help}
                    </span>
                  )}
                  {readOnly ? (
                    <p className="ink whitespace-pre-line">{displayValue(field, answers[field.id])}</p>
                  ) : (
                    <FieldInput field={field} value={answers[field.id]} onChange={(v) => onChange?.(field.id, v)} error={error} disabled={disabled} />
                  )}
                  {error && <span className="text-[12.5px] text-[var(--g-error-ink)]">{error}</span>}
                </div>
              );
            })}
          </div>
        </section>
      );
    })}
  </div>
  );
};

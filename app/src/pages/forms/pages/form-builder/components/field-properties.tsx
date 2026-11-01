import { DatePicker } from "@/components/ui/date-picker";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/ui/filter-select";
import { CHOICE_FIELD_TYPES, VALUE_FIELD_TYPES, type ExpirationPolicy, type FormDefinition, type FormField, type VisibilityOperator } from "@/features/forms/interfaces/forms.interfaces";
import type { FileFormat } from "@/features/documents/interfaces/documents.interfaces";
import { FileFormatFormOptions } from "@/config/constants/dropdowns/documents/file-format-form.options";
import { ExpirationPolicyFormOptions } from "@/config/constants/dropdowns/documents/expiration-policy-form.options";

/** Per-document expiry is hidden for now; new documents default to "no expiry". The backend still supports it. */
const SHOW_FIELD_EXPIRATION = false;
/** Per-document reminder override is hidden too; documents use the form / organization schedule. */
const SHOW_FIELD_REMINDER = false;
import { VisibilityOperatorOptions } from "@/config/constants/dropdowns/documents/visibility-operator.options";
import { getFieldTypeLabel } from "@/config/constants/dropdowns/documents/field-type-form.options";
import { ScheduleEditor, useScheduleSeed } from "@/pages/shared/components/schedule-editor";
import { HelpTip } from "@/components/ui/help-tip";

const intOrNull = (v: string) => (v === "" ? null : parseInt(v, 10));
const numOrNull = (v: string) => (v === "" ? null : Number(v));

/** Properties panel for the selected field. */
export const FieldProperties: FC<{ field: FormField; definition: FormDefinition; onChange: (patch: Partial<FormField>) => void; onDelete: () => void }> = ({ field, definition, onChange, onDelete }) => {
  const seedSchedule = useScheduleSeed();
  const { t } = useTranslation("forms");
  const isValue = VALUE_FIELD_TYPES.includes(field.type);
  const isChoice = CHOICE_FIELD_TYPES.includes(field.type);
  const isFile = field.type === "FILE_UPLOAD";
  const others = definition.sections.flatMap((s) => s.fields).filter((f) => f.id !== field.id && VALUE_FIELD_TYPES.includes(f.type));
  const source = others.find((f) => f.id === field.visibility?.field_id);
  const file = field.file;
  const setFile = (patch: Partial<NonNullable<FormField["file"]>>) => onChange({ file: { ...file!, ...patch } });

  return (
    <div>
      <div className="prop-group">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="!mb-0">{getFieldTypeLabel(field.type)}</h3>
          <Button size="sm" variant="ghost" className="text-[var(--g-error-ink)]" onClick={onDelete}>
            <Trash2 />
            {t("props.delete")}
          </Button>
        </div>
        {field.type !== "DIVIDER" && (
          <div className="field">
            <Label htmlFor="p-label">{field.type === "DESCRIPTION" ? t("props.text") : field.type === "HEADING" ? t("props.heading") : t("props.label")}</Label>
            {field.type === "DESCRIPTION" ? (
              <Textarea id="p-label" placeholder={t("props.textPlaceholder")} rows={3} value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
            ) : (
              <Input id="p-label" placeholder={t("props.labelPlaceholder")} value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
            )}
          </div>
        )}
        {(isValue || isFile) && (
          <>
            <div className="field mt-3">
              <Label htmlFor="p-help">{t("props.help")}</Label>
              <Textarea id="p-help" placeholder={t("props.helpPlaceholder")} rows={2} value={field.help ?? ""} onChange={(e) => onChange({ help: e.target.value || null })} />
            </div>
            <label className="mt-3 flex items-center justify-between">
              <span className="label">{t("props.required")}</span>
              <Switch checked={field.required} onCheckedChange={(v) => onChange({ required: v })} aria-label={t("props.required")} />
            </label>
          </>
        )}
        {isValue && ["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "PHONE"].includes(field.type) && (
          <div className="field mt-3">
            <Label htmlFor="p-ph">{t("props.placeholder")}</Label>
            <Input id="p-ph" placeholder={t("props.placeholderExample")} value={field.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value || null })} />
          </div>
        )}
      </div>

      {isChoice && (
        <div className="prop-group">
          <h3>{t("props.options")}</h3>
          <div className="flex flex-col gap-2">
            {(field.options ?? []).map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={t("props.optionN", { n: i + 1 })}
                  placeholder={t("props.optionN", { n: i + 1 })}
                  value={o}
                  onChange={(e) => onChange({ options: (field.options ?? []).map((x, j) => (j === i ? e.target.value : x)) })}
                />
                <Button size="icon" variant="ghost" aria-label={t("props.removeOption", { n: i + 1 })} disabled={(field.options ?? []).length <= 1} onClick={() => onChange({ options: (field.options ?? []).filter((_, j) => j !== i) })}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="self-start" onClick={() => onChange({ options: [...(field.options ?? []), t("props.optionN", { n: (field.options ?? []).length + 1 })] })}>
              <Plus />
              {t("props.addOption")}
            </Button>
          </div>
        </div>
      )}

      {isValue && (
        <div className="prop-group">
          <h3>{t("props.validation")}</h3>
          {(field.type === "SHORT_TEXT" || field.type === "LONG_TEXT") && (
            <div className="grid grid-cols-2 gap-2">
              <div className="field">
                <Label htmlFor="p-minl">{t("props.minLength")}</Label>
                <Input id="p-minl" placeholder={t("props.noMinimum")} type="number" min={0} value={field.validation?.min_length ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, min_length: intOrNull(e.target.value) } })} />
              </div>
              <div className="field">
                <Label htmlFor="p-maxl">{t("props.maxLength")}</Label>
                <Input id="p-maxl" placeholder={t("props.noMaximum")} type="number" min={1} value={field.validation?.max_length ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, max_length: intOrNull(e.target.value) } })} />
              </div>
              <div className="field col-span-2">
                <Label htmlFor="p-pat">{t("props.pattern")}</Label>
                <Input id="p-pat" placeholder={t("props.patternPlaceholder")} value={field.validation?.pattern ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, pattern: e.target.value || null } })} />
              </div>
              {field.validation?.pattern && (
                <div className="field col-span-2">
                  <Label htmlFor="p-patm">{t("props.errorMessage")}</Label>
                  <Input id="p-patm" placeholder={t("props.errorMessagePlaceholder")} value={field.validation?.pattern_message ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, pattern_message: e.target.value || null } })} />
                </div>
              )}
            </div>
          )}
          {field.type === "NUMBER" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="field">
                <Label htmlFor="p-min">{t("props.minimum")}</Label>
                <Input id="p-min" placeholder={t("props.noMinimum")} type="number" value={field.validation?.min ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, min: numOrNull(e.target.value) } })} />
              </div>
              <div className="field">
                <Label htmlFor="p-max">{t("props.maximum")}</Label>
                <Input id="p-max" placeholder={t("props.noMaximum")} type="number" value={field.validation?.max ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, max: numOrNull(e.target.value) } })} />
              </div>
            </div>
          )}
          {["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "PHONE", "DATE", "DROPDOWN", "MULTIPLE_CHOICE"].includes(field.type) && (
            <div className="field mt-2">
              <Label htmlFor="p-def">{t("props.defaultValue")}</Label>
              {field.type === "DATE" ? (
                <DatePicker id="p-def" value={(field.default_value as string) ?? ""} onChange={(v) => onChange({ default_value: v || undefined })} />
              ) : (
                <Input id="p-def" placeholder={t("props.defaultPlaceholder")} type={field.type === "NUMBER" ? "number" : "text"} value={(field.default_value as string) ?? ""} onChange={(e) => onChange({ default_value: e.target.value || undefined })} />
              )}
            </div>
          )}
          {field.type === "YES_NO" && (
            <div className="field mt-2">
              <Label>{t("props.defaultValue")}</Label>
              <FilterSelect
                label={t("props.defaultValue")}
                size="default"
                className="w-full"
                value={field.default_value === true ? "yes" : field.default_value === false ? "no" : "none"}
                onChange={(v) => onChange({ default_value: v === "none" ? undefined : v === "yes" })}
                options={[
                  { id: "none", label: t("props.noDefault") },
                  { id: "yes", label: t("props.yes") },
                  { id: "no", label: t("props.no") },
                ]}
              />
            </div>
          )}
        </div>
      )}

      {isFile && file && (
        <div className="prop-group">
          <h3>{t("props.documentSettings")}</h3>
          <span className="label">{t("props.acceptedFormats")}</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FileFormatFormOptions.map((o) => (
              <label key={o.id} className="flex items-center gap-2">
                <Checkbox
                  checked={file.accepted_formats.includes(o.id)}
                  onCheckedChange={(c) =>
                    setFile({
                      accepted_formats: c ? [...file.accepted_formats, o.id] : file.accepted_formats.filter((x: FileFormat) => x !== o.id).length ? file.accepted_formats.filter((x: FileFormat) => x !== o.id) : file.accepted_formats,
                    })
                  }
                />
                {o.label}
              </label>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="field">
              <Label htmlFor="p-size">{t("props.maxSize")}</Label>
              <Input id="p-size" placeholder="10" type="number" min={1} max={100} value={file.max_file_size_mb} onChange={(e) => setFile({ max_file_size_mb: Math.max(1, intOrNull(e.target.value) ?? 1) })} />
            </div>
            <div className="field">
              <Label htmlFor="p-files">{t("props.maxFiles")}</Label>
              <Input id="p-files" placeholder="1" type="number" min={1} max={20} value={file.max_files} onChange={(e) => setFile({ max_files: Math.max(1, intOrNull(e.target.value) ?? 1) })} />
            </div>
          </div>
          <label className="mt-3 flex items-center justify-between gap-2">
            <span className="label">{t("props.approvalRequired")}</span>
            <Switch checked={file.requires_approval} onCheckedChange={(v) => setFile({ requires_approval: v })} aria-label={t("props.approvalRequired")} />
          </label>
          <label className="mt-3 flex items-center justify-between gap-2">
            <span className="label">{t("props.multipleSubmissions")}</span>
            <Switch checked={file.allow_multiple_submissions} onCheckedChange={(v) => setFile({ allow_multiple_submissions: v })} aria-label={t("props.multipleSubmissions")} />
          </label>
          {SHOW_FIELD_EXPIRATION && (
          <>
          <div className="field mt-3">
            <div className="flex items-center gap-1.5">
              <Label>{t("props.expiration")}</Label>
              <HelpTip topic="expiration" />
            </div>
            <FilterSelect
              label={t("props.expirationPolicy")}
              size="default"
              className="w-full"
              value={file.expiration_policy ?? "inherit"}
              onChange={(v) => setFile({ expiration_policy: v === "inherit" ? null : (v as ExpirationPolicy) })}
              options={[{ id: "inherit", label: t("props.useFormDefault") }, ...ExpirationPolicyFormOptions]}
            />
          </div>
          {file.expiration_policy === "FROM_UPLOAD_DATE" && (
            <div className="field mt-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="p-expd">{t("props.daysAfterUpload")}</Label>
                <HelpTip topic="daysAfterUpload" />
              </div>
              <Input id="p-expd" placeholder={t("props.exampleDays")} type="number" min={1} value={file.expiration_days ?? ""} onChange={(e) => setFile({ expiration_days: intOrNull(e.target.value) })} />
            </div>
          )}
          {file.expiration_policy === "FIXED_DATE" && (
            <div className="field mt-2">
              <Label htmlFor="p-expf">{t("props.expiresOn")}</Label>
              <DatePicker id="p-expf" value={file.fixed_expiration_date} onChange={(v) => setFile({ fixed_expiration_date: v || null })} />
            </div>
          )}
          </>
          )}
          <div className="field mt-3">
            <Label htmlFor="p-instr">{t("props.instructions")}</Label>
            <Textarea id="p-instr" placeholder={t("props.instructionsPlaceholder")} rows={2} value={file.instructions ?? ""} onChange={(e) => setFile({ instructions: e.target.value || null })} />
          </div>
          {SHOW_FIELD_REMINDER && (
          <>
          <label className="mt-3 flex items-center justify-between gap-2">
            <span className="label">{t("props.customReminder")}</span>
            <Switch checked={!!file.reminder} onCheckedChange={(v) => setFile({ reminder: v ? seedSchedule() : null })} aria-label={t("props.customReminder")} />
          </label>
          {file.reminder && (
            <div className="mt-2">
              <ScheduleEditor value={file.reminder} onChange={(reminder) => setFile({ reminder })} />
            </div>
          )}
          </>
          )}
        </div>
      )}

      {(isValue || isFile || field.type === "HEADING" || field.type === "DESCRIPTION") && (
        <div className="prop-group">
          <h3>{t("props.conditional")}</h3>
          <label className="flex items-center justify-between gap-2">
            <span className="label">{t("props.onlyShowWhen")}</span>
            <Switch
              checked={!!field.visibility}
              disabled={!others.length}
              onCheckedChange={(v) => onChange({ visibility: v && others[0] ? { field_id: others[0].id, operator: "equals", value: others[0].type === "YES_NO" ? true : "" } : null })}
              aria-label={t("props.conditional")}
            />
          </label>
          {!others.length && <p className="caption mt-1">{t("props.addAnotherFirst")}</p>}
          {field.visibility && (
            <div className="mt-3 flex flex-col gap-2">
              <FilterSelect
                label={t("props.question")}
                size="default"
                className="w-full"
                value={field.visibility.field_id}
                onChange={(v) => onChange({ visibility: { ...field.visibility!, field_id: v, value: others.find((f) => f.id === v)?.type === "YES_NO" ? true : "" } })}
                options={others.map((f) => ({ id: f.id, label: f.label || t("props.untitledQuestion") }))}
              />
              <FilterSelect
                label={t("props.condition")}
                size="default"
                className="w-full"
                value={field.visibility.operator}
                onChange={(v) => onChange({ visibility: { ...field.visibility!, operator: v as VisibilityOperator } })}
                options={VisibilityOperatorOptions}
              />
              {!["answered", "not_answered"].includes(field.visibility.operator) &&
                (source?.type === "YES_NO" ? (
                  <FilterSelect
                    label={t("props.value")}
                    size="default"
                    className="w-full"
                    value={field.visibility.value === false ? "no" : "yes"}
                    onChange={(v) => onChange({ visibility: { ...field.visibility!, value: v === "yes" } })}
                    options={[
                      { id: "yes", label: t("props.yes") },
                      { id: "no", label: t("props.no") },
                    ]}
                  />
                ) : source && CHOICE_FIELD_TYPES.includes(source.type) ? (
                  <FilterSelect
                    label={t("props.value")}
                    size="default"
                    className="w-full"
                    value={String(field.visibility.value ?? "")}
                    onChange={(v) => onChange({ visibility: { ...field.visibility!, value: v } })}
                    options={(source.options ?? []).map((o) => ({ id: o, label: o }))}
                  />
                ) : (
                  <Input aria-label={t("props.value")} placeholder={t("props.valueToMatch")} value={String(field.visibility.value ?? "")} onChange={(e) => onChange({ visibility: { ...field.visibility!, value: e.target.value } })} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

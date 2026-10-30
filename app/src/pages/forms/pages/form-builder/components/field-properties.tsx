import type { FC } from "react";
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
import { VisibilityOperatorOptions } from "@/config/constants/dropdowns/documents/visibility-operator.options";
import { getFieldTypeLabel } from "@/config/constants/dropdowns/documents/field-type-form.options";
import { ScheduleEditor } from "@/pages/shared/components/schedule-editor";

const intOrNull = (v: string) => (v === "" ? null : parseInt(v, 10));
const numOrNull = (v: string) => (v === "" ? null : Number(v));

/** Properties panel for the selected field. */
export const FieldProperties: FC<{ field: FormField; definition: FormDefinition; onChange: (patch: Partial<FormField>) => void; onDelete: () => void }> = ({ field, definition, onChange, onDelete }) => {
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
            Delete
          </Button>
        </div>
        {field.type !== "DIVIDER" && (
          <div className="field">
            <Label htmlFor="p-label">{field.type === "DESCRIPTION" ? "Text" : field.type === "HEADING" ? "Heading" : "Label"}</Label>
            {field.type === "DESCRIPTION" ? (
              <Textarea id="p-label" placeholder="Informational text shown to the client" rows={3} value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
            ) : (
              <Input id="p-label" placeholder="e.g. Passport copy" value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
            )}
          </div>
        )}
        {(isValue || isFile) && (
          <>
            <div className="field mt-3">
              <Label htmlFor="p-help">Description / help text</Label>
              <Textarea id="p-help" placeholder="Help text shown under the question" rows={2} value={field.help ?? ""} onChange={(e) => onChange({ help: e.target.value || null })} />
            </div>
            <label className="mt-3 flex items-center justify-between">
              <span className="label">Required</span>
              <Switch checked={field.required} onCheckedChange={(v) => onChange({ required: v })} aria-label="Required" />
            </label>
          </>
        )}
        {isValue && ["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "PHONE"].includes(field.type) && (
          <div className="field mt-3">
            <Label htmlFor="p-ph">Placeholder</Label>
            <Input id="p-ph" value={field.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value || null })} />
          </div>
        )}
      </div>

      {isChoice && (
        <div className="prop-group">
          <h3>Options</h3>
          <div className="flex flex-col gap-2">
            {(field.options ?? []).map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Option ${i + 1}`}
                  placeholder={`Option ${i + 1}`}
                  value={o}
                  onChange={(e) => onChange({ options: (field.options ?? []).map((x, j) => (j === i ? e.target.value : x)) })}
                />
                <Button size="icon" variant="ghost" aria-label={`Remove option ${i + 1}`} disabled={(field.options ?? []).length <= 1} onClick={() => onChange({ options: (field.options ?? []).filter((_, j) => j !== i) })}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="self-start" onClick={() => onChange({ options: [...(field.options ?? []), `Option ${(field.options ?? []).length + 1}`] })}>
              <Plus />
              Add option
            </Button>
          </div>
        </div>
      )}

      {isValue && (
        <div className="prop-group">
          <h3>Validation &amp; default</h3>
          {(field.type === "SHORT_TEXT" || field.type === "LONG_TEXT") && (
            <div className="grid grid-cols-2 gap-2">
              <div className="field">
                <Label htmlFor="p-minl">Min length</Label>
                <Input id="p-minl" placeholder="No minimum" type="number" min={0} value={field.validation?.min_length ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, min_length: intOrNull(e.target.value) } })} />
              </div>
              <div className="field">
                <Label htmlFor="p-maxl">Max length</Label>
                <Input id="p-maxl" placeholder="No maximum" type="number" min={1} value={field.validation?.max_length ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, max_length: intOrNull(e.target.value) } })} />
              </div>
              <div className="field col-span-2">
                <Label htmlFor="p-pat">Pattern (regular expression)</Label>
                <Input id="p-pat" placeholder="e.g. ^EL\d{9}$" value={field.validation?.pattern ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, pattern: e.target.value || null } })} />
              </div>
              {field.validation?.pattern && (
                <div className="field col-span-2">
                  <Label htmlFor="p-patm">Error message</Label>
                  <Input id="p-patm" placeholder="e.g. Enter a valid tax number" value={field.validation?.pattern_message ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, pattern_message: e.target.value || null } })} />
                </div>
              )}
            </div>
          )}
          {field.type === "NUMBER" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="field">
                <Label htmlFor="p-min">Minimum</Label>
                <Input id="p-min" placeholder="No minimum" type="number" value={field.validation?.min ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, min: numOrNull(e.target.value) } })} />
              </div>
              <div className="field">
                <Label htmlFor="p-max">Maximum</Label>
                <Input id="p-max" placeholder="No maximum" type="number" value={field.validation?.max ?? ""} onChange={(e) => onChange({ validation: { ...field.validation, max: numOrNull(e.target.value) } })} />
              </div>
            </div>
          )}
          {["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "PHONE", "DATE", "DROPDOWN", "MULTIPLE_CHOICE"].includes(field.type) && (
            <div className="field mt-2">
              <Label htmlFor="p-def">Default value</Label>
              <Input id="p-def" placeholder="Pre-filled answer (optional)" type={field.type === "DATE" ? "date" : field.type === "NUMBER" ? "number" : "text"} value={(field.default_value as string) ?? ""} onChange={(e) => onChange({ default_value: e.target.value || undefined })} />
            </div>
          )}
          {field.type === "YES_NO" && (
            <div className="field mt-2">
              <Label>Default value</Label>
              <FilterSelect
                label="Default value"
                size="default"
                className="w-full"
                value={field.default_value === true ? "yes" : field.default_value === false ? "no" : "none"}
                onChange={(v) => onChange({ default_value: v === "none" ? undefined : v === "yes" })}
                options={[
                  { id: "none", label: "No default" },
                  { id: "yes", label: "Yes" },
                  { id: "no", label: "No" },
                ]}
              />
            </div>
          )}
        </div>
      )}

      {isFile && file && (
        <div className="prop-group">
          <h3>Document settings</h3>
          <span className="label">Accepted file formats</span>
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
              <Label htmlFor="p-size">Max size (MB)</Label>
              <Input id="p-size" placeholder="10" type="number" min={1} max={100} value={file.max_file_size_mb} onChange={(e) => setFile({ max_file_size_mb: Math.max(1, intOrNull(e.target.value) ?? 1) })} />
            </div>
            <div className="field">
              <Label htmlFor="p-files">Max files</Label>
              <Input id="p-files" placeholder="1" type="number" min={1} max={20} value={file.max_files} onChange={(e) => setFile({ max_files: Math.max(1, intOrNull(e.target.value) ?? 1) })} />
            </div>
          </div>
          <label className="mt-3 flex items-center justify-between gap-2">
            <span className="label">Employee approval required</span>
            <Switch checked={file.requires_approval} onCheckedChange={(v) => setFile({ requires_approval: v })} aria-label="Employee approval required" />
          </label>
          <label className="mt-3 flex items-center justify-between gap-2">
            <span className="label">Allow multiple submissions</span>
            <Switch checked={file.allow_multiple_submissions} onCheckedChange={(v) => setFile({ allow_multiple_submissions: v })} aria-label="Allow multiple submissions" />
          </label>
          <div className="field mt-3">
            <Label>Expiration</Label>
            <FilterSelect
              label="Expiration policy"
              size="default"
              className="w-full"
              value={file.expiration_policy ?? "inherit"}
              onChange={(v) => setFile({ expiration_policy: v === "inherit" ? null : (v as ExpirationPolicy) })}
              options={[{ id: "inherit", label: "Use the form default" }, ...ExpirationPolicyFormOptions]}
            />
          </div>
          {file.expiration_policy === "FROM_UPLOAD_DATE" && (
            <div className="field mt-2">
              <Label htmlFor="p-expd">Days after upload</Label>
              <Input id="p-expd" placeholder="e.g. 365" type="number" min={1} value={file.expiration_days ?? ""} onChange={(e) => setFile({ expiration_days: intOrNull(e.target.value) })} />
            </div>
          )}
          {file.expiration_policy === "FIXED_DATE" && (
            <div className="field mt-2">
              <Label htmlFor="p-expf">Expires on</Label>
              <Input id="p-expf" type="date" value={file.fixed_expiration_date ?? ""} onChange={(e) => setFile({ fixed_expiration_date: e.target.value || null })} />
            </div>
          )}
          <div className="field mt-3">
            <Label htmlFor="p-instr">Instructions for the client</Label>
            <Textarea id="p-instr" placeholder="e.g. Upload both sides of the document" rows={2} value={file.instructions ?? ""} onChange={(e) => setFile({ instructions: e.target.value || null })} />
          </div>
          <label className="mt-3 flex items-center justify-between gap-2">
            <span className="label">Custom reminder schedule</span>
            <Switch checked={!!file.reminder} onCheckedChange={(v) => setFile({ reminder: v ? { enabled: true, start_days_before: 7, interval_count: 3, interval_unit: "DAYS", send_time: "09:00" } : null })} aria-label="Custom reminder schedule" />
          </label>
          {file.reminder && (
            <div className="mt-2">
              <ScheduleEditor value={file.reminder} onChange={(reminder) => setFile({ reminder })} />
            </div>
          )}
        </div>
      )}

      {(isValue || isFile || field.type === "HEADING" || field.type === "DESCRIPTION") && (
        <div className="prop-group">
          <h3>Conditional visibility</h3>
          <label className="flex items-center justify-between gap-2">
            <span className="label">Only show when…</span>
            <Switch
              checked={!!field.visibility}
              disabled={!others.length}
              onCheckedChange={(v) => onChange({ visibility: v && others[0] ? { field_id: others[0].id, operator: "equals", value: others[0].type === "YES_NO" ? true : "" } : null })}
              aria-label="Conditional visibility"
            />
          </label>
          {!others.length && <p className="caption mt-1">Add another question first.</p>}
          {field.visibility && (
            <div className="mt-3 flex flex-col gap-2">
              <FilterSelect
                label="Question"
                size="default"
                className="w-full"
                value={field.visibility.field_id}
                onChange={(v) => onChange({ visibility: { ...field.visibility!, field_id: v, value: others.find((f) => f.id === v)?.type === "YES_NO" ? true : "" } })}
                options={others.map((f) => ({ id: f.id, label: f.label || "Untitled question" }))}
              />
              <FilterSelect
                label="Condition"
                size="default"
                className="w-full"
                value={field.visibility.operator}
                onChange={(v) => onChange({ visibility: { ...field.visibility!, operator: v as VisibilityOperator } })}
                options={VisibilityOperatorOptions}
              />
              {!["answered", "not_answered"].includes(field.visibility.operator) &&
                (source?.type === "YES_NO" ? (
                  <FilterSelect
                    label="Value"
                    size="default"
                    className="w-full"
                    value={field.visibility.value === false ? "no" : "yes"}
                    onChange={(v) => onChange({ visibility: { ...field.visibility!, value: v === "yes" } })}
                    options={[
                      { id: "yes", label: "Yes" },
                      { id: "no", label: "No" },
                    ]}
                  />
                ) : source && CHOICE_FIELD_TYPES.includes(source.type) ? (
                  <FilterSelect
                    label="Value"
                    size="default"
                    className="w-full"
                    value={String(field.visibility.value ?? "")}
                    onChange={(v) => onChange({ visibility: { ...field.visibility!, value: v } })}
                    options={(source.options ?? []).map((o) => ({ id: o, label: o }))}
                  />
                ) : (
                  <Input aria-label="Value" placeholder="Value to match" value={String(field.visibility.value ?? "")} onChange={(e) => onChange({ visibility: { ...field.visibility!, value: e.target.value } })} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

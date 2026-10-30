import { useEffect, useMemo, useRef, useState, type DragEvent, type FC } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Copy,
  FileUp,
  GripVertical,
  Hash,
  Heading,
  Inbox,
  Mail,
  Minus,
  Phone,
  Plus,
  Text,
  ToggleLeft,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { DetailSkeleton, EmptyState } from "@/components/ui/page-elements";
import { FormStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { useCreateForm, useForm, useUpdateForm } from "@/features/workspace/hooks/use-workspace-data";
import type { ExpirationPolicy, FieldType, FormDefinition, FormField, ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";
import { ExpirationPolicyFormOptions } from "@/config/constants/dropdowns/documents/expiration-policy-form.options";
import { FileFormatFormOptions } from "@/config/constants/dropdowns/documents/file-format-form.options";
import { getFieldTypeLabel } from "@/config/constants/dropdowns/documents/field-type-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/lib/api-error";
import { FormRenderer } from "@/pages/shared/components/form-renderer";
import { ScheduleEditor } from "@/pages/shared/components/schedule-editor";
import { FieldProperties } from "./components/field-properties";
import { emptyDefinition, findField, moveField, newField, uid, updateField } from "./builder.utils";

const PALETTE: Array<{ group: string; items: Array<{ type: FieldType; icon: typeof Type }> }> = [
  {
    group: "Questions",
    items: [
      { type: "SHORT_TEXT", icon: Type },
      { type: "LONG_TEXT", icon: AlignLeft },
      { type: "NUMBER", icon: Hash },
      { type: "EMAIL", icon: Mail },
      { type: "PHONE", icon: Phone },
      { type: "DATE", icon: Calendar },
      { type: "DROPDOWN", icon: ChevronDown },
      { type: "MULTIPLE_CHOICE", icon: CircleDot },
      { type: "CHECKBOXES", icon: CheckSquare },
      { type: "YES_NO", icon: ToggleLeft },
    ],
  },
  { group: "Documents", items: [{ type: "FILE_UPLOAD", icon: FileUp }] },
  {
    group: "Layout",
    items: [
      { type: "HEADING", icon: Heading },
      { type: "DESCRIPTION", icon: Text },
      { type: "DIVIDER", icon: Minus },
    ],
  },
];

interface Settings {
  is_template: boolean;
  is_public: boolean;
  default_expiration_policy: ExpirationPolicy;
  default_expiration_days: number | null;
  default_fixed_expiration_date: string | null;
  default_reminder: ReminderScheduleInput | null;
}

const FieldPreview: FC<{ field: FormField }> = ({ field }) => {
  switch (field.type) {
    case "HEADING":
      return <div className="fld-heading">{field.label || "Heading"}</div>;
    case "DESCRIPTION":
      return <p className="muted whitespace-pre-line">{field.label}</p>;
    case "DIVIDER":
      return <hr />;
    case "FILE_UPLOAD":
      return (
        <>
          <div className="fake file">
            <FileUp className="h-4 w-4" /> Client uploads {field.file?.max_files && field.file.max_files > 1 ? `up to ${field.file.max_files} files` : "a file"}
          </div>
          <div className="tags">
            <StatusBadge tone="plain">{(field.file?.accepted_formats ?? []).map((f) => getDropdownOptionLabel(FileFormatFormOptions, f)).join(", ")}</StatusBadge>
            <StatusBadge tone="plain">≤ {field.file?.max_file_size_mb} MB</StatusBadge>
            {field.file?.requires_approval && <StatusBadge tone="review">Approval</StatusBadge>}
            {field.file?.expiration_policy && field.file.expiration_policy !== "NONE" && <StatusBadge tone="expiring">Expires</StatusBadge>}
            {field.file?.reminder && <StatusBadge tone="invited">Custom reminders</StatusBadge>}
          </div>
        </>
      );
    case "DROPDOWN":
    case "MULTIPLE_CHOICE":
    case "CHECKBOXES":
      return (
        <div>
          {(field.options ?? []).slice(0, 4).map((o) => (
            <div key={o} className="opt-row">
              {field.type === "CHECKBOXES" ? <CheckSquare className="h-3.5 w-3.5" /> : field.type === "MULTIPLE_CHOICE" ? <CircleDot className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {o}
            </div>
          ))}
          {(field.options ?? []).length > 4 && <div className="caption">+{(field.options ?? []).length - 4} more</div>}
        </div>
      );
    case "YES_NO":
      return <div className="fake">Yes / No</div>;
    case "LONG_TEXT":
      return <div className="fake h-16 items-start pt-2">{field.placeholder || "Long answer"}</div>;
    default:
      return <div className="fake">{field.placeholder || getFieldTypeLabel(field.type)}</div>;
  }
};

/** Visual form builder: sections, drag-and-drop ordering, field editing, preview. */
const FormBuilderPage: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const form = useForm(id);
  const create = useCreateForm();
  const update = useUpdateForm();
  const [name, setName] = useState("Untitled form");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [definition, setDefinition] = useState<FormDefinition>(emptyDefinition);
  const [settings, setSettings] = useState<Settings>({
    is_template: false,
    is_public: false,
    default_expiration_policy: "MANUAL",
    default_expiration_days: null,
    default_fixed_expiration_date: null,
    default_reminder: null,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<"field" | "form">("form");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [dirty, setDirty] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, unknown>>({});
  const [errorList, setErrorList] = useState<string[]>([]);

  useEffect(() => {
    if (form.data) {
      setName(form.data.name);
      setDescription(form.data.description ?? "");
      setInstructions(form.data.instructions ?? "");
      setDefinition(form.data.definition.sections.length ? form.data.definition : emptyDefinition());
      setSettings({
        is_template: form.data.is_template,
        is_public: form.data.is_public,
        default_expiration_policy: form.data.default_expiration_policy,
        default_expiration_days: form.data.default_expiration_days,
        default_fixed_expiration_date: form.data.default_fixed_expiration_date,
        default_reminder: form.data.default_reminder,
      });
      setDirty(false);
    }
  }, [form.data]);

  const allowLeave = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname);

  const change = (next: FormDefinition) => {
    setDefinition(next);
    setDirty(true);
  };
  const selectedField = useMemo(() => findField(definition, selected), [definition, selected]);
  const counts = useMemo(() => {
    const all = definition.sections.flatMap((s) => s.fields);
    return { questions: all.filter((f) => !["HEADING", "DESCRIPTION", "DIVIDER", "FILE_UPLOAD"].includes(f.type)).length, documents: all.filter((f) => f.type === "FILE_UPLOAD").length };
  }, [definition]);

  const addField = (type: FieldType) => {
    const field = newField(type);
    const target = selectedField?.section.id ?? definition.sections[definition.sections.length - 1]?.id;
    const index = selectedField ? selectedField.index + 1 : Infinity;
    if (!target) return;
    change({
      sections: definition.sections.map((s) => {
        if (s.id !== target) return s;
        const fields = [...s.fields];
        fields.splice(Math.min(index, fields.length), 0, field);
        return { ...s, fields };
      }),
    });
    setSelected(field.id);
    setPanel("field");
  };

  const removeField = (fieldId: string) => {
    change({
      sections: definition.sections.map((s) => ({
        ...s,
        fields: s.fields.filter((f) => f.id !== fieldId).map((f) => (f.visibility?.field_id === fieldId ? { ...f, visibility: null } : f)),
      })),
    });
    setSelected(null);
    setPanel("form");
  };

  const duplicateField = (field: FormField, sectionId: string, index: number) => {
    const copy = { ...structuredClone(field), id: uid("f"), label: field.label ? `${field.label} (copy)` : field.label };
    change(moveField({ sections: definition.sections.map((s) => (s.id === sectionId ? { ...s, fields: [...s.fields, copy] } : s)) }, copy.id, sectionId, index + 1));
    setSelected(copy.id);
  };

  const onDrop = (e: DragEvent, sectionId: string, index: number) => {
    e.preventDefault();
    if (dragId) change(moveField(definition, dragId, sectionId, index));
    setDragId(null);
    setOverId(null);
  };

  const payload = (publish?: boolean) => ({
    name: name.trim() || "Untitled form",
    description: description || null,
    instructions: instructions || null,
    definition,
    ...settings,
    publish,
  });

  const onError = (e: Error) => {
    const errs = Object.values((e as ApiError).fieldErrors ?? {});
    setErrorList(errs.length ? errs : [e.message]);
  };

  const save = (publish?: boolean) => {
    setErrorList([]);
    if (isNew) {
      create.mutate(payload(publish), {
        onSuccess: (f) => {
          setDirty(false);
          allowLeave.current = true;
          navigate(Routes.forms.edit(f.id), { replace: true });
        },
        onError,
      });
    } else {
      update.mutate({ id: id!, ...payload(publish) }, { onSuccess: () => setDirty(false), onError });
    }
  };

  if (!isNew && form.isPending) return <DetailSkeleton />;
  if (!isNew && form.isError) return <div className="callout bad">{form.error.message}</div>;
  const status = form.data?.status ?? "DRAFT";
  const saving = create.isPending || update.isPending;

  return (
    <div>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={Routes.forms.root}>Forms &amp; Templates</Link>
        <span>›</span>
        <span>{name || "Untitled form"}</span>
      </nav>
      <div className="page-head">
        <div className="flex flex-wrap items-center gap-2">
          <FormStatusBadge status={status} />
          {dirty && <StatusBadge tone="notreq">Unsaved changes</StatusBadge>}
          <span className="caption">
            {counts.questions} questions · {counts.documents} documents
            {form.data?.assignment_count ? ` · assigned to ${form.data.assignment_count} clients` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented" role="tablist" aria-label="Mode">
            <button role="tab" aria-selected={mode === "edit"} className={cn(mode === "edit" && "active")} onClick={() => setMode("edit")}>
              Edit
            </button>
            <button role="tab" aria-selected={mode === "preview"} className={cn(mode === "preview" && "active")} onClick={() => setMode("preview")}>
              Preview
            </button>
          </div>
          {!isNew && (
            <Button variant="outline" asChild>
              <Link to={Routes.forms.submissions(id!)}>
                <Inbox />
                Submissions
              </Link>
            </Button>
          )}
          {status === "PUBLISHED" ? (
            <Button loading={saving} disabled={!dirty} onClick={() => save()}>
              Save form
            </Button>
          ) : (
            <>
              <Button variant="outline" loading={saving && !update.variables?.publish && !create.variables?.publish} onClick={() => save(false)}>
                Save draft
              </Button>
              <Button loading={saving && (!!update.variables?.publish || !!create.variables?.publish)} onClick={() => save(true)}>
                Publish
              </Button>
            </>
          )}
        </div>
      </div>
      {status === "PUBLISHED" && dirty && (
        <div className="callout mb-4">
          Saving publishes the changes for new assignments. Clients who already received this form keep the version they were sent.
        </div>
      )}
      {errorList.length > 0 && (
        <div className="callout bad mb-4 flex-col">
          {errorList.map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>
      )}

      <div className={cn("builder", mode === "preview" && "is-preview")}>
        <aside className="card panel palette p-2" aria-label="Add a field">
          {PALETTE.map((g) => (
            <div key={g.group}>
              <span className="eyebrow">{g.group}</span>
              {g.items.map((item) => (
                <button key={item.type} onClick={() => addField(item.type)}>
                  <item.icon className="h-4 w-4" />
                  {getFieldTypeLabel(item.type)}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className={cn("card", mode === "preview" && "preview-mode")}>
          <div className="canvas-title">
            <input aria-label="Form title" value={name} onChange={(e) => (setName(e.target.value), setDirty(true))} readOnly={mode === "preview"} />
            {mode === "edit" ? (
              <textarea aria-label="Description" rows={2} placeholder="Describe what this form is for" value={description} onChange={(e) => (setDescription(e.target.value), setDirty(true))} />
            ) : (
              description && <p className="muted">{description}</p>
            )}
            {mode === "edit" ? (
              <textarea
                aria-label="Instructions for clients"
                rows={2}
                placeholder="Instructions shown to clients above the form (optional)"
                value={instructions}
                onChange={(e) => (setInstructions(e.target.value), setDirty(true))}
              />
            ) : (
              instructions && <p className="muted whitespace-pre-line">{instructions}</p>
            )}
          </div>

          {mode === "preview" ? (
            <div className="p-4">
              <FormRenderer
                definition={definition}
                answers={previewAnswers}
                onChange={(k, v) => setPreviewAnswers((a) => ({ ...a, [k]: v }))}
                renderFile={(f) => (
                  <div className="req-card">
                    <div>
                      <div className="title">
                        {f.label}
                        {f.required && <span className="text-[var(--g-error)]">*</span>}
                        <StatusBadge tone="missing">Missing</StatusBadge>
                      </div>
                      {f.help && <p className="instr">{f.help}</p>}
                      <div className="meta caption">
                        {(f.file?.accepted_formats ?? []).map((x) => getDropdownOptionLabel(FileFormatFormOptions, x)).join(", ")} · up to {f.file?.max_file_size_mb} MB
                      </div>
                    </div>
                    <Button size="sm" disabled>
                      Upload
                    </Button>
                  </div>
                )}
              />
              <p className="caption mt-4 text-center">This is how clients see the form. Nothing is submitted from the preview.</p>
            </div>
          ) : (
            <div className="pb-4">
              {definition.sections.map((section, si) => (
                <div key={section.id}>
                  <div className="sec-bar">
                    <input
                      aria-label="Section title"
                      className="grow bg-transparent outline-none"
                      value={section.title}
                      onChange={(e) => change({ sections: definition.sections.map((s) => (s.id === section.id ? { ...s, title: e.target.value } : s)) })}
                    />
                    <span className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Move section up" disabled={si === 0} onClick={() => change({ sections: swap(definition.sections, si, si - 1) })}>
                        <ArrowUp />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Move section down" disabled={si === definition.sections.length - 1} onClick={() => change({ sections: swap(definition.sections, si, si + 1) })}>
                        <ArrowDown />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Delete section"
                        disabled={definition.sections.length === 1}
                        onClick={() => change({ sections: definition.sections.filter((s) => s.id !== section.id) })}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => onDrop(e, section.id, section.fields.length)}
                    className="min-h-[24px]"
                  >
                    {section.fields.length === 0 && <div className="canvas-empty caption rounded-lg border border-dashed p-4 text-center">Add fields from the left, or drag one here.</div>}
                    {section.fields.map((field, fi) => (
                      <div
                        key={field.id}
                        className={cn("fld", selected === field.id && "selected", dragId === field.id && "dragging", overId === field.id && "over")}
                        draggable
                        onDragStart={(e) => {
                          setDragId(field.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverId(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOverId(field.id);
                        }}
                        onDrop={(e) => {
                          e.stopPropagation();
                          onDrop(e, section.id, fi);
                        }}
                        onClick={() => {
                          setSelected(field.id);
                          setPanel("field");
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${getFieldTypeLabel(field.type)}: ${field.label || "untitled"}`}
                        onKeyDown={(e) => e.key === "Enter" && (setSelected(field.id), setPanel("field"))}
                      >
                        <GripVertical className="grip h-4 w-4" aria-hidden />
                        <div className="body">
                          {!["HEADING", "DESCRIPTION", "DIVIDER"].includes(field.type) && (
                            <div className="lbl">
                              {field.label || <span className="soft">Untitled</span>}
                              {field.required && <span className="req">*</span>}
                              {field.visibility && <StatusBadge tone="invited" className="!text-[11px]">Conditional</StatusBadge>}
                            </div>
                          )}
                          {field.help && <div className="help">{field.help}</div>}
                          <FieldPreview field={field} />
                        </div>
                        <div className="acts" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Move up" disabled={fi === 0 && si === 0} onClick={() => change(fi > 0 ? moveField(definition, field.id, section.id, fi - 1) : moveField(definition, field.id, definition.sections[si - 1].id, Infinity))}>
                            <ArrowUp />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            aria-label="Move down"
                            disabled={fi === section.fields.length - 1 && si === definition.sections.length - 1}
                            onClick={() => change(fi < section.fields.length - 1 ? moveField(definition, field.id, section.id, fi + 1) : moveField(definition, field.id, definition.sections[si + 1].id, 0))}
                          >
                            <ArrowDown />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Duplicate" onClick={() => duplicateField(field, section.id, fi)}>
                            <Copy />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Delete" onClick={() => removeField(field.id)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="px-4 pt-4">
                <Button variant="outline" size="sm" onClick={() => change({ sections: [...definition.sections, { id: uid("s"), title: `Section ${definition.sections.length + 1}`, description: null, fields: [] }] })}>
                  <Plus />
                  Add section
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="card panel" aria-label="Properties">
          <div className="tabs !m-0 px-2" role="tablist">
            <button role="tab" aria-selected={panel === "field"} className={cn("tab", panel === "field" && "active")} onClick={() => setPanel("field")}>
              Field
            </button>
            <button role="tab" aria-selected={panel === "form"} className={cn("tab", panel === "form" && "active")} onClick={() => setPanel("form")}>
              Form settings
            </button>
          </div>
          {panel === "field" ? (
            selectedField ? (
              <FieldProperties
                key={selectedField.field.id}
                field={selectedField.field}
                definition={definition}
                onChange={(patch) => change(updateField(definition, selectedField.field.id, patch))}
                onDelete={() => removeField(selectedField.field.id)}
              />
            ) : (
              <EmptyState title="No field selected" description="Click a field in the form to edit it." />
            )
          ) : (
            <div>
              <div className="prop-group">
                <h3>Availability</h3>
                <label className="flex items-center justify-between gap-2">
                  <span>
                    <span className="label block">Reusable template</span>
                    <span className="caption">Listed under Templates.</span>
                  </span>
                  <Switch checked={settings.is_template} onCheckedChange={(v) => (setSettings((s) => ({ ...s, is_template: v })), setDirty(true))} aria-label="Reusable template" />
                </label>
                <label className="mt-3 flex items-center justify-between gap-2">
                  <span>
                    <span className="label block">Share on the public portal</span>
                    <span className="caption">Only when your portal is in public mode.</span>
                  </span>
                  <Switch checked={settings.is_public} onCheckedChange={(v) => (setSettings((s) => ({ ...s, is_public: v })), setDirty(true))} aria-label="Share on the public portal" />
                </label>
              </div>
              <div className="prop-group">
                <h3>Default expiration policy</h3>
                <FilterSelect
                  label="Default expiration policy"
                  size="default"
                  className="w-full"
                  value={settings.default_expiration_policy}
                  onChange={(v) => (setSettings((s) => ({ ...s, default_expiration_policy: v as ExpirationPolicy })), setDirty(true))}
                  options={ExpirationPolicyFormOptions}
                />
                {settings.default_expiration_policy === "FROM_UPLOAD_DATE" && (
                  <div className="field mt-2">
                    <Label htmlFor="fs-days">Days after upload</Label>
                    <Input id="fs-days" placeholder="e.g. 365" type="number" min={1} value={settings.default_expiration_days ?? ""} onChange={(e) => (setSettings((s) => ({ ...s, default_expiration_days: e.target.value ? parseInt(e.target.value, 10) : null })), setDirty(true))} />
                  </div>
                )}
                {settings.default_expiration_policy === "FIXED_DATE" && (
                  <div className="field mt-2">
                    <Label htmlFor="fs-date">Expires on</Label>
                    <Input id="fs-date" type="date" value={settings.default_fixed_expiration_date ?? ""} onChange={(e) => (setSettings((s) => ({ ...s, default_fixed_expiration_date: e.target.value || null })), setDirty(true))} />
                  </div>
                )}
                <p className="caption mt-2">Applies to document fields set to “Use the form default”.</p>
              </div>
              <div className="prop-group">
                <h3>Default reminder schedule</h3>
                <label className="flex items-center justify-between gap-2">
                  <span className="label">Override the organization default</span>
                  <Switch
                    checked={!!settings.default_reminder}
                    onCheckedChange={(v) => (setSettings((s) => ({ ...s, default_reminder: v ? { enabled: true, start_days_before: 7, interval_count: 3, interval_unit: "DAYS", send_time: "09:00" } : null })), setDirty(true))}
                    aria-label="Override reminder schedule"
                  />
                </label>
                {settings.default_reminder && (
                  <div className="mt-2">
                    <ScheduleEditor value={settings.default_reminder} onChange={(v) => (setSettings((s) => ({ ...s, default_reminder: v })), setDirty(true))} />
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
      <ConfirmationDialog
        isOpen={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        title="Leave without saving?"
        description="Your changes to this form will be lost."
        confirmText="Leave"
        variant="destructive"
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
};

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

export default FormBuilderPage;

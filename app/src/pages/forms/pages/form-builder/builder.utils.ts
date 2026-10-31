import i18n from "@/i18n";
import type { FieldType, FormDefinition, FormField } from "@/features/forms/interfaces/forms.interfaces";

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

/** Sensible defaults for a newly added field. */
export function newField(type: FieldType): FormField {
  const base: FormField = { id: uid("f"), type, label: "", required: false };
  switch (type) {
    case "HEADING":
      return { ...base, label: i18n.t("forms:builder.defaults.heading") };
    case "DESCRIPTION":
      return { ...base, label: i18n.t("forms:builder.defaults.description") };
    case "DIVIDER":
      return base;
    case "DROPDOWN":
    case "MULTIPLE_CHOICE":
    case "CHECKBOXES":
      return { ...base, label: i18n.t("forms:builder.defaults.question"), options: [i18n.t("forms:builder.defaults.option", { n: 1 }), i18n.t("forms:builder.defaults.option", { n: 2 })] };
    case "FILE_UPLOAD":
      return {
        ...base,
        label: i18n.t("forms:builder.defaults.document"),
        required: true,
        file: { accepted_formats: ["PDF", "IMAGE"], max_file_size_mb: 10, max_files: 1, allow_multiple_submissions: false, requires_approval: true, expiration_policy: null },
      };
    default:
      return { ...base, label: i18n.t("forms:builder.defaults.question") };
  }
}

export function emptyDefinition(): FormDefinition {
  return { sections: [{ id: uid("s"), title: i18n.t("forms:builder.defaults.section"), description: null, fields: [] }] };
}

/** Moves a field to a section/index (used by drag-and-drop and the arrow buttons). */
export function moveField(def: FormDefinition, fieldId: string, toSection: string, toIndex: number): FormDefinition {
  let moving: FormField | undefined;
  const sections = def.sections.map((s) => {
    const idx = s.fields.findIndex((f) => f.id === fieldId);
    if (idx === -1) return s;
    moving = s.fields[idx];
    return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) };
  });
  if (!moving) return def;
  return {
    sections: sections.map((s) => {
      if (s.id !== toSection) return s;
      const fields = [...s.fields];
      fields.splice(Math.max(0, Math.min(toIndex, fields.length)), 0, moving!);
      return { ...s, fields };
    }),
  };
}

export function updateField(def: FormDefinition, fieldId: string, patch: Partial<FormField>): FormDefinition {
  return { sections: def.sections.map((s) => ({ ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) })) };
}

export function findField(def: FormDefinition, fieldId: string | null) {
  for (const s of def.sections) {
    const index = s.fields.findIndex((f) => f.id === fieldId);
    if (index !== -1) return { section: s, field: s.fields[index], index };
  }
  return null;
}

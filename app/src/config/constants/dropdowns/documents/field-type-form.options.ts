import type { FieldType } from "@/features/forms/interfaces/forms.interfaces";

export const FieldTypeFormOptions: { id: FieldType; label: string }[] = [
  { id: "SHORT_TEXT", label: "Short text" },
  { id: "LONG_TEXT", label: "Long text" },
  { id: "NUMBER", label: "Number" },
  { id: "EMAIL", label: "Email" },
  { id: "PHONE", label: "Phone" },
  { id: "DATE", label: "Date" },
  { id: "DROPDOWN", label: "Dropdown" },
  { id: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { id: "CHECKBOXES", label: "Checkboxes" },
  { id: "FILE_UPLOAD", label: "File upload" },
  { id: "YES_NO", label: "Yes / No" },
  { id: "HEADING", label: "Heading" },
  { id: "DESCRIPTION", label: "Description" },
  { id: "DIVIDER", label: "Divider" },
];

export function getFieldTypeLabel(id?: FieldType | string | null): string {
  return FieldTypeFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

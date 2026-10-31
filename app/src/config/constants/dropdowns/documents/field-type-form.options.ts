import type { FieldType } from "@/features/forms/interfaces/forms.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "forms:fieldType";

export const FieldTypeFormOptions: { id: FieldType; label: string }[] = lazyOptions(
  ["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "PHONE", "DATE", "DROPDOWN", "MULTIPLE_CHOICE", "CHECKBOXES", "FILE_UPLOAD", "YES_NO", "HEADING", "DESCRIPTION", "DIVIDER"] as const,
  PREFIX,
);

export function getFieldTypeLabel(id?: FieldType | string | null): string {
  return optionLabel(PREFIX, id);
}

import type { FormStatus } from "@/features/forms/interfaces/forms.interfaces";

export const FormStatusFormOptions: { id: FormStatus; label: string }[] = [
  { id: "DRAFT", label: "Draft" },
  { id: "PUBLISHED", label: "Published" },
  { id: "ARCHIVED", label: "Archived" },
];

export function getFormStatusLabel(id?: FormStatus | string | null): string {
  return FormStatusFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

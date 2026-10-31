import type { FormStatus } from "@/features/forms/interfaces/forms.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "forms:formStatus";

export const FormStatusFormOptions: { id: FormStatus; label: string }[] = lazyOptions(["DRAFT", "PUBLISHED", "ARCHIVED"] as const, PREFIX);

export function getFormStatusLabel(id?: FormStatus | string | null): string {
  return optionLabel(PREFIX, id);
}

import type { ExpirationPolicy } from "@/features/forms/interfaces/forms.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "forms:expirationPolicy";

export const ExpirationPolicyFormOptions: { id: ExpirationPolicy; label: string }[] = lazyOptions(["NONE", "MANUAL", "FROM_UPLOAD_DATE", "FIXED_DATE"] as const, PREFIX);

export function getExpirationPolicyLabel(id?: ExpirationPolicy | string | null): string {
  return optionLabel(PREFIX, id);
}

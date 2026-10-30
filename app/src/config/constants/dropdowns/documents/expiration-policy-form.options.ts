import type { ExpirationPolicy } from "@/features/forms/interfaces/forms.interfaces";

export const ExpirationPolicyFormOptions: { id: ExpirationPolicy; label: string }[] = [
  { id: "NONE", label: "No expiration" },
  { id: "MANUAL", label: "Entered by an employee" },
  { id: "FROM_UPLOAD_DATE", label: "Calculated from the upload date" },
  { id: "FIXED_DATE", label: "Fixed date" },
];

export function getExpirationPolicyLabel(id?: ExpirationPolicy | string | null): string {
  return ExpirationPolicyFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

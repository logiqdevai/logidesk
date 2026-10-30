import type { PortalStatus } from "@/features/clients/interfaces/clients.interfaces";

export const PortalStatusFormOptions: { id: PortalStatus; label: string }[] = [
  { id: "active", label: "Portal active" },
  { id: "invited", label: "Invited" },
  { id: "not_invited", label: "Not invited" },
  { id: "disabled", label: "Portal disabled" },
];

export function getPortalStatusLabel(id?: PortalStatus | string | null): string {
  return PortalStatusFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

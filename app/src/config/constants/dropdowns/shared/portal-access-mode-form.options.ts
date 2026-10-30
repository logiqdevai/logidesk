import type { PortalAccessMode } from "@/features/organizations/interfaces/organizations.interfaces";

export const PortalAccessModeFormOptions: { id: PortalAccessMode; label: string }[] = [
  { id: "PRIVATE", label: "Clients sign in themselves" },
  { id: "PUBLIC", label: "Public portal for everyone" },
];

export function getPortalAccessModeLabel(id?: PortalAccessMode | string | null): string {
  return PortalAccessModeFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

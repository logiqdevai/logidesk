import type { OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";

export const OrganizationRoleFormOptions: { id: OrganizationRole; label: string }[] = [
  { id: "OWNER", label: "Owner" },
  { id: "ADMIN", label: "Admin" },
  { id: "MEMBER", label: "Member" },
];

export function getOrganizationRoleLabel(id?: OrganizationRole | string | null): string {
  return OrganizationRoleFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

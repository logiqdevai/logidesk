import i18n from "@/i18n";
import type { OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";

const role = (id: OrganizationRole): { id: OrganizationRole; label: string } => ({
  id,
  get label() {
    return i18n.t(`roles.${id}`, { ns: "team" });
  },
});

/** `label` resolves lazily so it follows the active language at render time. */
export const OrganizationRoleFormOptions: { id: OrganizationRole; label: string }[] = [role("OWNER"), role("ADMIN"), role("MEMBER")];

export function getOrganizationRoleLabel(id?: OrganizationRole | string | null): string {
  return OrganizationRoleFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

import i18n from "@/i18n";
import type { PortalAccessMode } from "@/features/organizations/interfaces/organizations.interfaces";

/** `label` is resolved lazily so it follows the active language. */
export const PortalAccessModeFormOptions: { id: PortalAccessMode; label: string }[] = (["PRIVATE", "PUBLIC"] as const).map((id) => ({
  id,
  get label() {
    return i18n.t(`ui:portalAccessMode.${id}`);
  },
}));

export function getPortalAccessModeLabel(id?: PortalAccessMode | string | null): string {
  return PortalAccessModeFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

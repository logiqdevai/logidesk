import i18n from "@/i18n";
import type { PortalStatus } from "@/features/clients/interfaces/clients.interfaces";

const status = (id: PortalStatus): { id: PortalStatus; label: string } => ({
  id,
  get label() {
    return i18n.t(`portalStatus.${id}`, { ns: "clients" });
  },
});

/** `label` resolves lazily so it follows the active language at render time. */
export const PortalStatusFormOptions: { id: PortalStatus; label: string }[] = [status("active"), status("invited"), status("not_invited"), status("disabled")];

export function getPortalStatusLabel(id?: PortalStatus | string | null): string {
  return PortalStatusFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

import i18n from "@/i18n";
import type { PortalStatus } from "@/features/clients/interfaces/clients.interfaces";
import { PortalStatusFormOptions } from "./portal-status-form.options";

export const PortalStatusFilterOptions: { id: PortalStatus | "all"; label: string }[] = [
  {
    id: "all",
    get label() {
      return i18n.t("options.portal.any", { ns: "clients" });
    },
  },
  ...PortalStatusFormOptions,
];

import type { PortalStatus } from "@/features/clients/interfaces/clients.interfaces";
import { PortalStatusFormOptions } from "./portal-status-form.options";

export const PortalStatusFilterOptions: { id: PortalStatus | "all"; label: string }[] = [
  { id: "all", label: "Any portal status" },
  ...PortalStatusFormOptions,
];

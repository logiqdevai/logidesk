import i18n from "@/i18n";
import type { OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";

/** Values resolve lazily (getters) so they follow the active language at render time. */
export const OrganizationRoleDescriptionOptions: Record<OrganizationRole, string> = {
  get OWNER() {
    return i18n.t("roleDescriptions.OWNER", { ns: "team" });
  },
  get ADMIN() {
    return i18n.t("roleDescriptions.ADMIN", { ns: "team" });
  },
  get MEMBER() {
    return i18n.t("roleDescriptions.MEMBER", { ns: "team" });
  },
};

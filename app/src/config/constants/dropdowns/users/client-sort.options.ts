import i18n from "@/i18n";

/** `label` resolves lazily so it follows the active language at render time. */
const opt = (id: string, key: string): { id: string; label: string } => ({
  id,
  get label() {
    return i18n.t(key, { ns: "clients" });
  },
});

export const ClientSortOptions: { id: string; label: string }[] = [opt("name", "options.sort.name"), opt("created_at", "options.sort.newest")];

export const ClientStatusFilterOptions: { id: string; label: string }[] = [opt("ACTIVE", "options.status.active"), opt("ARCHIVED", "options.status.archived"), opt("all", "options.status.all")];

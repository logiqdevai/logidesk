import i18n from "@/i18n";

/** An option whose label is translated lazily (on every read), so it follows runtime language changes. */
export const lazyOption = <T extends string>(id: T, key: string): { id: T; label: string } => ({
  id,
  get label() {
    return i18n.t(key);
  },
});

/** Builds lazily translated options from ids, using prefix.id as the i18n key. */
export const lazyOptions = <T extends string>(ids: readonly T[], prefix: string) => ids.map((id) => lazyOption(id, `${prefix}.${id}`));

/** Translates prefix.id, falling back to the raw id (or an em dash when empty). */
export const optionLabel = (prefix: string, id?: string | null): string => (id ? i18n.t(`${prefix}.${id}`, { defaultValue: String(id) }) : "—");

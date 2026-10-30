/** Reads the display label of an enum value from a `{ id, label }[]` options list. */
export function getDropdownOptionLabel<T extends string>(options: ReadonlyArray<{ id: T | string; label: string }>, id?: T | string | null): string {
  if (!id) return "—";
  return options.find((o) => o.id === id)?.label ?? String(id);
}

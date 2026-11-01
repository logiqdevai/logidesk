/** Product name — the single place it is defined. Import it instead of hardcoding it. */
export const APP_NAME = 'LogiDesk';

/** Lowercase identifier for technical keys (Redis prefixes, queue names). Changing it invalidates existing keys. */
export const APP_SLUG = 'logidesk';

/** Previous product names that may still appear in stored templates and bodies. */
const LEGACY_APP_NAMES = ['Gatherly'];

/** Rewrites legacy product names to the current one. */
export function normalizeAppName(text: string): string;
export function normalizeAppName(text: string | null | undefined): string | null;
export function normalizeAppName(text: string | null | undefined): string | null {
  if (text == null) return null;
  return LEGACY_APP_NAMES.reduce((out, legacy) => out.split(legacy).join(APP_NAME), text);
}

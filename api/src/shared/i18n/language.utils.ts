export type AppLanguage = 'en' | 'el';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

/** Picks the response language from an `Accept-Language` header value: Greek when it starts with `el`, otherwise English. */
export function resolveLanguage(header?: string | string[] | null): AppLanguage {
  const value = Array.isArray(header) ? header[0] : header;
  return value && /^\s*el\b/i.test(value) ? 'el' : DEFAULT_LANGUAGE;
}

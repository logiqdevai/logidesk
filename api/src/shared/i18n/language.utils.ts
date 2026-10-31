export type AppLanguage = 'en' | 'el';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

const COUNTRY_LANGUAGES: Record<string, AppLanguage> = { GR: 'el', CY: 'el' };

/** Language spoken in an ISO 3166-1 alpha-2 country, or `undefined` when we have no translation for it. */
export function languageForCountry(country?: string | null): AppLanguage | undefined {
  return country ? COUNTRY_LANGUAGES[country.trim().toUpperCase()] : undefined;
}

/** Picks the response language from an `Accept-Language` header value: Greek when it starts with `el`, otherwise English. */
export function resolveLanguage(header?: string | string[] | null): AppLanguage {
  const value = Array.isArray(header) ? header[0] : header;
  return value && /^\s*el\b/i.test(value) ? 'el' : DEFAULT_LANGUAGE;
}

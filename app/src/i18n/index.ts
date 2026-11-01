import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

export const LANGUAGES = [
  { code: "en", label: "English", flag: "GB" },
  { code: "el", label: "Ελληνικά", flag: "GR" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export const LANGUAGE_STORAGE_KEY = "logidesk-language";

/** Every `locales/<lng>/<namespace>.json` file is a namespace, e.g. `useTranslation("clients")`. */
const files = import.meta.glob("./locales/*/*.json", { eager: true, import: "default" }) as Record<string, Record<string, unknown>>;
const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, content] of Object.entries(files)) {
  const [, lng, ns] = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)!;
  (resources[lng] ??= {})[ns] = content;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: LANGUAGES.map((l) => l.code),
    fallbackLng: "en",
    defaultNS: "common",
    ns: Object.keys(resources.en ?? { common: 1 }),
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], lookupLocalStorage: LANGUAGE_STORAGE_KEY, caches: ["localStorage"] },
  });

const syncDocumentLang = (lng: string) => {
  document.documentElement.lang = lng;
};
syncDocumentLang(i18n.resolvedLanguage ?? "en");
i18n.on("languageChanged", syncDocumentLang);

/** The active language as `en` | `el`. */
export const currentLanguage = (): LanguageCode => (i18n.resolvedLanguage === "el" ? "el" : "en");

export default i18n;

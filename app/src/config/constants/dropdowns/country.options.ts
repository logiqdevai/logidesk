import { intlLocale } from "@/i18n/locale";

const getCountryFlag = (countryCode: string): string => {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

/** Localised display name via Intl; falls back to the English name. */
const displayName = (type: "region" | "language", code: string, fallback: string): string => {
    try {
        return new Intl.DisplayNames([intlLocale()], { type }).of(code) ?? fallback;
    } catch {
        return fallback;
    }
};

const COUNTRY_DATA: [name: string, code: string, phoneCode: string, language: string, languageCode: string][] = [
    ["Austria", "AT", "+43", "German", "de"],
    ["Belgium", "BE", "+32", "Dutch", "nl"],
    ["Bulgaria", "BG", "+359", "Bulgarian", "bg"],
    ["Croatia", "HR", "+385", "Croatian", "hr"],
    ["Cyprus", "CY", "+357", "Greek", "el"],
    ["Czech Republic", "CZ", "+420", "Czech", "cs"],
    ["Denmark", "DK", "+45", "Danish", "da"],
    ["Estonia", "EE", "+372", "Estonian", "et"],
    ["Finland", "FI", "+358", "Finnish", "fi"],
    ["France", "FR", "+33", "French", "fr"],
    ["Germany", "DE", "+49", "German", "de"],
    ["Greece", "GR", "+30", "Greek", "el"],
    ["Hungary", "HU", "+36", "Hungarian", "hu"],
    ["Ireland", "IE", "+353", "English", "en"],
    ["Italy", "IT", "+39", "Italian", "it"],
    ["Latvia", "LV", "+371", "Latvian", "lv"],
    ["Lithuania", "LT", "+370", "Lithuanian", "lt"],
    ["Luxembourg", "LU", "+352", "French", "fr"],
    ["Malta", "MT", "+356", "Maltese", "mt"],
    ["Netherlands", "NL", "+31", "Dutch", "nl"],
    ["Poland", "PL", "+48", "Polish", "pl"],
    ["Portugal", "PT", "+351", "Portuguese", "pt"],
    ["Romania", "RO", "+40", "Romanian", "ro"],
    ["Slovakia", "SK", "+421", "Slovak", "sk"],
    ["Slovenia", "SI", "+386", "Slovenian", "sl"],
    ["Spain", "ES", "+34", "Spanish", "es"],
    ["Sweden", "SE", "+46", "Swedish", "sv"],
];

/** `label` and `language_label` are resolved lazily so they follow the active UI language; `name_en` is the stable English name. */
export const CountryOptions = COUNTRY_DATA.map(([name, code, phoneCode, language, languageCode]) => ({
    name_en: name,
    get label() {
        return displayName("region", code, name);
    },
    value: code,
    phone_code: phoneCode,
    icon: getCountryFlag(code),
    get language_label() {
        return displayName("language", languageCode, language);
    },
    language_value: languageCode,
}));

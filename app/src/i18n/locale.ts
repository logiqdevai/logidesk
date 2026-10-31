import { el, enGB } from "date-fns/locale";
import { currentLanguage } from "@/i18n";

/** date-fns locale for the active UI language. */
export const dateLocale = () => (currentLanguage() === "el" ? el : enGB);

/** Intl locale tag for the active UI language. */
export const intlLocale = () => (currentLanguage() === "el" ? "el-GR" : "en-GB");

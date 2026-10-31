import { useEffect } from "react";
import i18n from "@/i18n";
import { useAuthStore } from "@/stores/auth";

/** Applies the signed-in user's saved language (the profile wins over the browser's choice). */
export function I18nSync() {
  const language = useAuthStore((s) => s.user?.language);
  useEffect(() => {
    if (language && language !== i18n.resolvedLanguage) void i18n.changeLanguage(language);
  }, [language]);
  return null;
}

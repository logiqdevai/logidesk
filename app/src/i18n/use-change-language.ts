import { useCallback } from "react";
import i18n, { type LanguageCode } from "@/i18n";
import { useAuthStore } from "@/stores/auth";
import { updateProfile } from "@/features/auth/services/auth.services";

/** Switches the UI language and, when signed in, saves it to the user's profile (it drives the API's replies). */
export function useChangeLanguage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  return useCallback(
    async (language: LanguageCode) => {
      await i18n.changeLanguage(language);
      if (!user) return;
      try {
        setUser(await updateProfile({ language }));
      } catch {
        // Keep the choice locally; it is saved on the next successful change.
      }
    },
    [user, setUser],
  );
}

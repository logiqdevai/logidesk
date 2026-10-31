import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { Country } from "react-phone-number-input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGUAGES, type LanguageCode } from "@/i18n";
import { useChangeLanguage } from "@/i18n/use-change-language";

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const changeLanguage = useChangeLanguage();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <CountryFlag country={(LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0]).flag as Country} title={t("language.change")} />
          <span className="sr-only">{t("language.change")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => changeLanguage(l.code as LanguageCode)} className="gap-2">
            <CountryFlag country={l.flag as Country} title={l.label} />
            {l.label}
            <IconCheck size={14} className={cn("ml-auto", i18n.resolvedLanguage !== l.code && "hidden")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

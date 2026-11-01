import type { FC } from "react";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Yellow padlock marking UI that only admins / super admins can see. Place it inside the matching `<RoleGate>`. */
export const AdminLockIcon: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("common");
  return <Lock className={cn("h-3.5 w-3.5 shrink-0 text-yellow-500", className)} aria-label={t("adminOnly")} role="img">
    <title>{t("adminOnly")}</title>
  </Lock>;
};

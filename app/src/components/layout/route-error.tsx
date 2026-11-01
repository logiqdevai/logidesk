import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/page-elements";
import { Routes } from "@/routes/routes";

/** Last-resort error screen for unexpected rendering errors. */
export const RouteError: FC = () => {
  const { t } = useTranslation("layout");
  return (
    <main className="page max-w-xl pt-16">
      <BrandLogo className="!p-0" />
      <h1 className="mt-8">{t("routeError.title")}</h1>
      <p className="muted mt-2">{t("routeError.message")}</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={() => window.location.reload()}>{t("routeError.reload")}</Button>
        <Button variant="outline" onClick={() => (window.location.href = Routes.root)}>
          {t("routeError.goHome")}
        </Button>
      </div>
    </main>
  );
};

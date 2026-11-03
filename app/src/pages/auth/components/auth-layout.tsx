import { LanguageSwitch } from "@/components/ui/language-switch";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/ui/page-elements";
import { StatusBadge as Badge } from "@/components/ui/status-badge";

/** Two-column auth layout from the mockups (form + dark brand panel). */
const AuthLayout: FC<{ title: ReactNode; children: ReactNode }> = ({ title, children }) => {
  const { t } = useTranslation("auth");
  return (
    <div className="auth">
      <main className="auth-form">
        <div className="flex items-center justify-between gap-3">
          <h1>{title}</h1>
          <LanguageSwitch />
        </div>
        {children}
      </main>
      <aside className="auth-side" aria-hidden>
        <BrandLogo showName className="mb-4" />
        <h2>{t("layout.headline")}</h2>
        <p className="quote">{t("layout.quote")}</p>
        <div className="mini">
          <div className="row between">
            <span>{t("layout.sample.taxCertificate")}</span>
            <Badge tone="review">{t("layout.sample.underReview")}</Badge>
          </div>
          <div className="row between">
            <span>{t("layout.sample.passport")}</span>
            <Badge tone="approved">{t("layout.sample.approved")}</Badge>
          </div>
          <div className="row between">
            <span>{t("layout.sample.insurance")}</span>
            <Badge tone="expiring">{t("layout.sample.expiresIn", { count: 19 })}</Badge>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AuthLayout;

import { LanguageSwitch } from "@/components/ui/language-switch";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Settings, User, ChevronsUpDown } from "lucide-react";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/ui/page-elements";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSignOut } from "@/features/auth/hooks/use-auth";
import { usePortalMe } from "@/features/portal/hooks/use-portal";

const LINKS = [
  { to: Routes.portal.root, label: "overview", end: true },
  { to: Routes.portal.forms, label: "forms" },
  { to: Routes.portal.documents, label: "documents" },
  { to: Routes.portal.information, label: "information" },
  { to: Routes.portal.account, label: "account" },
];

/** Client portal: simplified top navigation, visually related to the business dashboard. */
const PortalShell: FC = () => {
  const { t } = useTranslation("layout");
  const me = usePortalMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const org = me.data?.organization;
  return (
    <div className="min-h-screen" style={org?.accent_color ? ({ ["--g-primary" as string]: org.accent_color } as React.CSSProperties) : undefined}>
      <header className="portal-nav">
        <BrandLogo to={Routes.portal.root} className="!p-0" />
        <nav className="links" aria-label={t("portal.clientPortal")}>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn("nav-link whitespace-nowrap", isActive && "active")}>
              {t(`portal.links.${l.label}`)}
            </NavLink>
          ))}
        </nav>
        {org && <span className="org-tag hidden md:inline">{org.name}</span>}
        <LanguageSwitch />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="icon-btn" aria-label={t("portal.accountMenu")}>
              <User className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[230px]">
            <DropdownMenuLabel className="eyebrow">{me.data ? `${me.data.client.first_name} ${me.data.client.last_name}` : t("portal.account")}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => navigate(Routes.portal.account)}>
              <Settings className="h-4 w-4" />
              {t("portal.accountSettings")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(Routes.workspaces)}>
              <ChevronsUpDown className="h-4 w-4" />
              {t("portal.switchWorkspaceOrPortal")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[var(--g-error-ink)]" onSelect={() => signOut.mutate()}>
              <LogOut className="h-4 w-4" />
              {t("portal.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="portal-page">
        <Outlet />
      </main>
    </div>
  );
};

export default PortalShell;

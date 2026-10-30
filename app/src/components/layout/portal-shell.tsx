import type { FC } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Settings, User, ChevronsUpDown } from "lucide-react";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/ui/page-elements";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSignOut } from "@/features/auth/hooks/use-auth";
import { usePortalMe } from "@/features/portal/hooks/use-portal";

const LINKS = [
  { to: Routes.portal.root, label: "Overview", end: true },
  { to: Routes.portal.forms, label: "My Forms" },
  { to: Routes.portal.documents, label: "My Documents" },
  { to: Routes.portal.information, label: "My Information" },
  { to: Routes.portal.account, label: "Account Settings" },
];

/** Client portal: simplified top navigation, visually related to the business dashboard. */
const PortalShell: FC = () => {
  const me = usePortalMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const org = me.data?.organization;
  return (
    <div className="min-h-screen" style={org?.accent_color ? ({ ["--g-primary" as string]: org.accent_color } as React.CSSProperties) : undefined}>
      <header className="portal-nav">
        <BrandLogo to={Routes.portal.root} className="!p-0" />
        <nav className="links" aria-label="Client portal">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn("nav-link whitespace-nowrap", isActive && "active")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        {org && <span className="org-tag hidden md:inline">{org.name}</span>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="icon-btn" aria-label="Account menu">
              <User className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[230px]">
            <DropdownMenuLabel className="eyebrow">{me.data ? `${me.data.client.first_name} ${me.data.client.last_name}` : "Account"}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => navigate(Routes.portal.account)}>
              <Settings className="h-4 w-4" />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(Routes.workspaces)}>
              <ChevronsUpDown className="h-4 w-4" />
              Switch workspace or portal
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[var(--g-error-ink)]" onSelect={() => signOut.mutate()}>
              <LogOut className="h-4 w-4" />
              Sign out
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

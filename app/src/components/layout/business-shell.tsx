import { LanguageSwitch } from "@/components/ui/language-switch";
import { useEffect, useState, type FC, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronsUpDown,
  FileText,
  FolderOpen,
  Inbox,
  LifeBuoy,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Send,
  Settings,
  SquarePen,
  Upload,
  User,
  UserPlus,
  Users,
  UsersRound,
  ShieldCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import { Routes } from "@/routes/routes";
import { RoleGate } from "@/components/access/role-gate";
import { AdminLockIcon } from "@/components/access/admin-lock-icon";
import { AdminOnlyAccess, CreateWorkspaceAccess, PlatformAdminAccess } from "@/config/constants/access/workspace-access";
import type { RoleAccess } from "@/hooks/use-role-access";
import { cn } from "@/lib/utils";
import { BrandLogo, InitialsAvatar } from "@/components/ui/page-elements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSignOut, useSwitchContext, useWorkspace } from "@/features/auth/hooks/use-auth";
import { useInboxCounts } from "@/features/workspace/hooks/use-workspace-data";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { fullName, initials } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  {
    group: "workspace",
    items: [
      { to: Routes.dashboard, label: "dashboard", icon: LayoutDashboard },
      { to: Routes.clients.root, label: "clients", icon: Users },
      { to: Routes.documents, label: "documents", icon: FileText },
      { to: Routes.files, label: "files", icon: FolderOpen },
      { to: Routes.inbox.root, label: "inbox", icon: Inbox, badge: true },
      { to: Routes.forms.root, label: "forms", icon: SquarePen },
    ],
  },
  { group: "communication", items: [{ to: Routes.notifications, label: "notifications", icon: Bell }] },
  { group: "account", items: [{ to: Routes.settings.root, label: "settings", icon: Settings }] },
  {
    group: "administration",
    // The heading is only shown to those who can see an item in it (Team and Contact are hidden for now).
    access: PlatformAdminAccess,
    items: [
      { to: Routes.team, label: "team", icon: UsersRound, access: AdminOnlyAccess, hidden: true },
      { to: Routes.admin.users, label: "adminUsers", icon: ShieldCheck, access: PlatformAdminAccess },
      { to: Routes.contact, label: "contact", icon: LifeBuoy, hidden: true },
    ],
  },
] as {
  group: string;
  /** Gates the whole group, heading included. */
  access?: RoleAccess;
  items: { to: string; label: string; icon: typeof Users; badge?: boolean; access?: RoleAccess; /** Not shown in the sidebar for now (the page and route still exist). */ hidden?: boolean }[];
}[];

const BusinessShell: FC = () => {
  const { t } = useTranslation("layout");
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { workspace, me, can, isLoading } = useWorkspace();
  const counts = useInboxCounts();
  const switchContext = useSwitchContext();
  const signOut = useSignOut();
  const [search, setSearch] = useState("");

  useEffect(() => setNavOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    document.body.classList.toggle("nav-open", navOpen);
    return () => document.body.classList.remove("nav-open");
  }, [navOpen]);

  const userName = fullName(me?.user) || me?.user.email || "";
  const needsReview = counts.data?.needs_review ?? 0;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`${Routes.clients.root}?search=${encodeURIComponent(search.trim())}`);
    setSearch("");
  };

  return (
    <div className="app">
      <aside className="sidebar" aria-label={t("business.mainNav")}>
        <BrandLogo to={Routes.dashboard} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="org-switch" aria-label={t("business.switchWorkspace")}>
              {workspace?.logo_url ? (
                <span className="logo overflow-hidden !bg-transparent">
                  <img src={workspace.logo_url} alt="" className="h-full w-full object-contain" />
                </span>
              ) : (
                <span className="logo">{initials(workspace?.name)}</span>
              )}
              <span className="grow text-left">
                {isLoading ? <Skeleton className="h-4 w-28" /> : <span className="name block truncate">{workspace?.name}</span>}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[260px]">
            <DropdownMenuLabel className="eyebrow">{t("business.yourWorkspaces")}</DropdownMenuLabel>
            {me?.workspaces.map((w) => (
              <DropdownMenuItem
                key={w.organization_id}
                onSelect={() => w.organization_id !== workspace?.organization_id && switchContext.mutate({ organization_id: w.organization_id })}
              >
                <span className="grow truncate">{w.name}</span>
                {w.organization_id === workspace?.organization_id && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            {!!me?.portals.length && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="eyebrow">{t("business.clientPortals")}</DropdownMenuLabel>
                {me.portals.map((p) => (
                  <DropdownMenuItem key={p.client_user_id} onSelect={() => switchContext.mutate({ client_user_id: p.client_user_id })}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    {p.organization_name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <RoleGate {...CreateWorkspaceAccess}>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate(`${Routes.workspaces}?create=1`)}>
                <Plus className="h-4 w-4" />
                {t("business.createWorkspace")}
              </DropdownMenuItem>
            </RoleGate>
          </DropdownMenuContent>
        </DropdownMenu>

        {NAV.map((group) => {
          const section = (
          <div className="nav-group" key={group.group}>
            <span className="eyebrow">{t(`nav.groups.${group.group}`)}</span>
            {group.items.filter((item) => !item.hidden).map((item) => {
              const link = (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("nav-link", isActive && "active")}>
                  <item.icon className="h-4 w-4" />
                  {t(`nav.items.${item.label}`)}
                  {item.access && <AdminLockIcon className="ml-auto" />}
                  {item.badge && needsReview > 0 && (
                    <span className="count" title={t("business.needsReviewTitle")}>
                      {needsReview}
                    </span>
                  )}
                </NavLink>
              );
              return item.access ? (
                <RoleGate key={item.to} {...item.access}>
                  {link}
                </RoleGate>
              ) : (
                link
              );
            })}
          </div>
          );
          return group.access ? (
            <RoleGate key={group.group} {...group.access}>
              {section}
            </RoleGate>
          ) : (
            section
          );
        })}

        <div className="sidebar-foot">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="user-chip w-full rounded-md text-left hover:bg-[var(--g-surface-card)]">
                <InitialsAvatar name={userName || "?"} />
                <span className="grow min-w-0">
                  <span className="name block truncate">{userName}</span>
                  <span className="caption block truncate">{me?.user.email}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-[230px]">
              <DropdownMenuItem onSelect={() => navigate(Routes.settings.tab("profile"))}>
                <User className="h-4 w-4" />
                {t("business.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(Routes.workspaces)}>
                <ChevronsUpDown className="h-4 w-4" />
                {t("business.allWorkspaces")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[var(--g-error-ink)]" onSelect={() => signOut.mutate()}>
                <LogOut className="h-4 w-4" />
                {t("business.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <div className="content">
        <header className="topbar">
          <button className="icon-btn flat menu-btn" aria-label={t("business.openMenu")} onClick={() => setNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <form className="search" onSubmit={onSearch} role="search">
            <label className="sr-only" htmlFor="global-search">
              {t("business.searchLabel")}
            </label>
            <Search className="icon" />
            <Input
              id="global-search"
              className="h-9 bg-[var(--g-surface-soft)] pl-9"
              placeholder={t("business.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <span className="grow" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus />
                {t("business.new")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              {can(Permissions.CLIENTS_CREATE) && (
                <DropdownMenuItem onSelect={() => navigate(Routes.clients.new)}>
                  <UserPlus className="h-4 w-4" />
                  {t("business.addClient")}
                </DropdownMenuItem>
              )}
              {can(Permissions.FORMS_MANAGE) && (
                <DropdownMenuItem onSelect={() => navigate(Routes.forms.new)}>
                  <SquarePen className="h-4 w-4" />
                  {t("business.createForm")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => navigate(`${Routes.clients.root}?assign=1`)}>
                <Send className="h-4 w-4" />
                {t("business.assignForm")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(`${Routes.documents}?upload=1`)}>
                <Upload className="h-4 w-4" />
                {t("business.uploadDocument")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate(`${Routes.dashboard}?reminders=1`)}>
                <Bell className="h-4 w-4" />
                {t("business.sendReminders")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link className="icon-btn" to={Routes.inbox.root} aria-label={needsReview ? t("business.inboxLabelNeedsReview", { count: needsReview }) : t("business.inboxLabel")}>
            <Inbox className="h-4 w-4" />
            {needsReview > 0 && <span className="dot" />}
          </Link>
          <LanguageSwitch />
        </header>
        <main className="page" id="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BusinessShell;

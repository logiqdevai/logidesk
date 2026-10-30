import { useEffect, useState, type FC, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronsUpDown,
  FileText,
  FolderOpen,
  Inbox,
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
  Check,
  ExternalLink,
} from "lucide-react";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { BrandLogo, InitialsAvatar } from "@/components/ui/page-elements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSignOut, useSwitchContext, useWorkspace } from "@/features/auth/hooks/use-auth";
import { useInboxCounts } from "@/features/workspace/hooks/use-workspace-data";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { getOrganizationRoleLabel } from "@/config/constants/dropdowns/users/organization-role-form.options";
import { fullName, initials } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  {
    group: "Workspace",
    items: [
      { to: Routes.dashboard, label: "Dashboard", icon: LayoutDashboard },
      { to: Routes.clients.root, label: "Clients", icon: Users },
      { to: Routes.documents, label: "Documents", icon: FileText },
      { to: Routes.files, label: "File Space", icon: FolderOpen },
      { to: Routes.inbox.root, label: "Document Inbox", icon: Inbox, badge: true },
      { to: Routes.forms.root, label: "Forms & Templates", icon: SquarePen },
    ],
  },
  { group: "Communication", items: [{ to: Routes.notifications, label: "Notifications", icon: Bell }] },
  {
    group: "Administration",
    items: [
      { to: Routes.team, label: "Team", icon: UsersRound },
      { to: Routes.settings.root, label: "Settings", icon: Settings },
    ],
  },
];

const BusinessShell: FC = () => {
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
      <aside className="sidebar" aria-label="Main navigation">
        <BrandLogo to={Routes.dashboard} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="org-switch" aria-label="Switch workspace">
              <span className="logo">{initials(workspace?.name)}</span>
              <span className="grow text-left">
                {isLoading ? <Skeleton className="h-4 w-28" /> : <span className="name block truncate">{workspace?.name}</span>}
                <span className="role">{workspace ? getOrganizationRoleLabel(workspace.role) : ""}</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[260px]">
            <DropdownMenuLabel className="eyebrow">Your workspaces</DropdownMenuLabel>
            {me?.workspaces.map((w) => (
              <DropdownMenuItem
                key={w.organization_id}
                onSelect={() => w.organization_id !== workspace?.organization_id && switchContext.mutate({ organization_id: w.organization_id })}
              >
                <span className="grow truncate">{w.name}</span>
                <span className="caption">{getOrganizationRoleLabel(w.role)}</span>
                {w.organization_id === workspace?.organization_id && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            {!!me?.portals.length && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="eyebrow">Client portals</DropdownMenuLabel>
                {me.portals.map((p) => (
                  <DropdownMenuItem key={p.client_user_id} onSelect={() => switchContext.mutate({ client_user_id: p.client_user_id })}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    {p.organization_name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate(`${Routes.workspaces}?create=1`)}>
              <Plus className="h-4 w-4" />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {NAV.map((group) => (
          <div className="nav-group" key={group.group}>
            <span className="eyebrow">{group.group}</span>
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("nav-link", isActive && "active")}>
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge && needsReview > 0 && (
                  <span className="count" title="Items needing review">
                    {needsReview}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

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
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(Routes.workspaces)}>
                <ChevronsUpDown className="h-4 w-4" />
                All workspaces
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[var(--g-error-ink)]" onSelect={() => signOut.mutate()}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <div className="content">
        <header className="topbar">
          <button className="icon-btn flat menu-btn" aria-label="Open menu" onClick={() => setNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <form className="search" onSubmit={onSearch} role="search">
            <label className="sr-only" htmlFor="global-search">
              Search clients
            </label>
            <Search className="icon" />
            <Input
              id="global-search"
              className="h-9 bg-[var(--g-surface-soft)] pl-9"
              placeholder="Search clients by name or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <span className="grow" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              {can(Permissions.CLIENTS_CREATE) && (
                <DropdownMenuItem onSelect={() => navigate(Routes.clients.new)}>
                  <UserPlus className="h-4 w-4" />
                  Add client
                </DropdownMenuItem>
              )}
              {can(Permissions.FORMS_MANAGE) && (
                <DropdownMenuItem onSelect={() => navigate(Routes.forms.new)}>
                  <SquarePen className="h-4 w-4" />
                  Create document form
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => navigate(`${Routes.clients.root}?assign=1`)}>
                <Send className="h-4 w-4" />
                Assign a form
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(`${Routes.documents}?upload=1`)}>
                <Upload className="h-4 w-4" />
                Upload a document
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate(`${Routes.dashboard}?reminders=1`)}>
                <Bell className="h-4 w-4" />
                Send reminders
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link className="icon-btn" to={Routes.inbox.root} aria-label={`Document Inbox${needsReview ? `, ${needsReview} need review` : ""}`}>
            <Inbox className="h-4 w-4" />
            {needsReview > 0 && <span className="dot" />}
          </Link>
        </header>
        <main className="page" id="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BusinessShell;

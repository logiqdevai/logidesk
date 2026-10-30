import type { FC } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, Building2, FileText, Globe, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-elements";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { DocumentsSection, NotificationsSection, OrganizationSection, PortalSection, ProfileSection } from "./components/settings-sections";

const TABS = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "portal", label: "Client Portal", icon: Globe },
  { id: "documents", label: "Document Settings", icon: FileText },
  { id: "profile", label: "Your profile", icon: User },
];

const SettingsPage: FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "organization";
  const { can } = useWorkspace();
  const canSettings = can(Permissions.SETTINGS_MANAGE);
  const canNotifications = can(Permissions.NOTIFICATIONS_MANAGE);
  return (
    <>
      <PageHeader title="Settings" description={canSettings ? "Configure your workspace." : "You can view workspace settings. Only Owners and Admins can change them."} />
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.id} className={cn("nav-link whitespace-nowrap", tab === t.id && "active")} onClick={() => setParams({ tab: t.id }, { replace: true })}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 max-w-5xl">
          {tab === "organization" && <OrganizationSection canManage={canSettings} />}
          {tab === "notifications" && <NotificationsSection canManage={canNotifications} />}
          {tab === "portal" && <PortalSection canManage={canSettings} />}
          {tab === "documents" && <DocumentsSection canManage={canSettings} />}
          {tab === "profile" && <ProfileSection />}
        </div>
      </div>
    </>
  );
};

export default SettingsPage;

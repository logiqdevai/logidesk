import type { FC } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, Building2, FileText, Globe, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-elements";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { useRoleAccess } from "@/hooks/use-role-access";
import { AdminOnlyAccess } from "@/config/constants/access/workspace-access";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { DocumentsSection, NotificationsSection, OrganizationSection, PortalSection, ProfileSection } from "./components/settings-sections";

const TABS = [
  { id: "organization", icon: Building2 },
  { id: "notifications", icon: Bell },
  { id: "portal", icon: Globe },
  { id: "documents", icon: FileText },
  { id: "profile", icon: User },
] as const;

const SettingsPage: FC = () => {
  const { t } = useTranslation("settings");
  const [params, setParams] = useSearchParams();
  const isAdmin = useRoleAccess(AdminOnlyAccess);
  const requestedTab = params.get("tab") ?? "organization";
  const tab = requestedTab === "documents" && !isAdmin ? "organization" : requestedTab;
  const visibleTabs = TABS.filter((tb) => tb.id !== "documents" || isAdmin);
  const { can } = useWorkspace();
  const canSettings = can(Permissions.SETTINGS_MANAGE);
  const canNotifications = can(Permissions.NOTIFICATIONS_MANAGE);
  return (
    <>
      <PageHeader title={t("title")} description={canSettings ? t("descriptionManage") : t("descriptionReadOnly")} />
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col" aria-label={t("sectionsLabel")}>
          {visibleTabs.map((tb) => (
            <button key={tb.id} className={cn("nav-link whitespace-nowrap", tab === tb.id && "active")} onClick={() => setParams({ tab: tb.id }, { replace: true })}>
              <tb.icon className="h-4 w-4" />
              {t(`tabs.${tb.id}`)}
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

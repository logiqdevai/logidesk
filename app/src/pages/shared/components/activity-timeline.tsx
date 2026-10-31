import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Check, Clock, FileUp, Inbox, PenSquare, Send, UserPlus, Users, X, AlertTriangle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import type { ActivityItem } from "@/features/dashboard/interfaces/dashboard.interfaces";

function iconFor(action: string) {
  if (action.includes("approved")) return { Icon: Check, tone: "ok" };
  if (action.includes("rejected") || action.includes("failed")) return { Icon: X, tone: "bad" };
  if (action.includes("expired") || action.includes("duplicate")) return { Icon: Clock, tone: "warn" };
  if (action.startsWith("document.")) return { Icon: FileUp, tone: "brand" };
  if (action.startsWith("reminder.") || action.startsWith("notification.")) return { Icon: Send, tone: "" };
  if (action.startsWith("form.")) return { Icon: PenSquare, tone: "" };
  if (action.startsWith("client.")) return { Icon: Users, tone: "brand" };
  if (action.startsWith("team.")) return { Icon: UserPlus, tone: "" };
  if (action.startsWith("inbox.")) return { Icon: Inbox, tone: "" };
  if (action.startsWith("settings.")) return { Icon: Settings, tone: "" };
  if (action.startsWith("requirement.") || action.startsWith("assignment.")) return { Icon: AlertTriangle, tone: "" };
  return { Icon: Bell, tone: "" };
}

/** Chronological activity / audit timeline. */
export const ActivityTimeline: FC<{ items: ActivityItem[]; showClient?: boolean; empty?: string }> = ({ items, showClient = true, empty }) => {
  const { t } = useTranslation("documents");
  if (!items.length) return <p className="muted py-4">{empty ?? t("activity.empty")}</p>;
  return (
    <ul className="timeline">
      {items.map((a) => {
        const { Icon, tone } = iconFor(a.action);
        return (
          <li key={a.id}>
            <span className={cn("ico", tone)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div>
                <b className="ink">{a.actor_name}</b> <span>{lowerFirst(a.description ?? a.action)}</span>
              </div>
              <div className="when">
                {formatRelative(a.created_at)}
                {showClient && a.client ? ` · ${a.client.name}` : ""}
                {a.actor_type === "CLIENT_USER" ? ` · ${t("activity.viaPortal")}` : a.actor_type === "SYSTEM" ? ` · ${t("activity.automatic")}` : ""}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

import type { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getRequirementStatusLabel } from "@/config/constants/dropdowns/documents/requirement-status-form.options";
import { getAssignmentStatusLabel } from "@/config/constants/dropdowns/documents/assignment-status-form.options";
import { getInboxStatusLabel } from "@/config/constants/dropdowns/documents/inbox-status-form.options";
import { getNotificationStatusLabel } from "@/config/constants/dropdowns/notifications/notification-status-form.options";
import { getPortalStatusLabel } from "@/config/constants/dropdowns/users/portal-status-form.options";
import { getConfidenceLabel } from "@/config/constants/dropdowns/documents/confidence-form.options";
import { getFormStatusLabel } from "@/config/constants/dropdowns/documents/form-status-form.options";

export type BadgeTone =
  | "missing"
  | "review"
  | "approved"
  | "rejected"
  | "expired"
  | "expiring"
  | "notreq"
  | "invited"
  | "coral"
  | "plain"
  | "employee";

/** Pill badge from the design system (`.badge` + tone). */
export const StatusBadge: FC<{ tone: BadgeTone; children: ReactNode; className?: string; title?: string }> = ({ tone, children, className, title }) => (
  <span className={cn("badge", tone, className)} title={title}>
    {children}
  </span>
);

const REQUIREMENT_TONE: Record<string, BadgeTone> = {
  MISSING: "missing",
  SUBMITTED: "review",
  UNDER_REVIEW: "review",
  APPROVED: "approved",
  REJECTED: "rejected",
  EXPIRED: "expired",
  NOT_REQUIRED: "notreq",
  REPLACED: "notreq",
};

export const RequirementStatusBadge: FC<{ status: string; expiringSoon?: boolean }> = ({ status, expiringSoon }) =>
  expiringSoon && status === "APPROVED" ? (
    <StatusBadge tone="expiring">Expiring soon</StatusBadge>
  ) : (
    <StatusBadge tone={REQUIREMENT_TONE[status] ?? "plain"}>{status === "REPLACED" ? "Replaced" : getRequirementStatusLabel(status)}</StatusBadge>
  );

const ASSIGNMENT_TONE: Record<string, BadgeTone> = {
  NOT_STARTED: "notreq",
  IN_PROGRESS: "review",
  UNDER_REVIEW: "review",
  COMPLETE: "approved",
  OVERDUE: "rejected",
  CANCELLED: "notreq",
};

export const AssignmentStatusBadge: FC<{ status: string }> = ({ status }) => (
  <StatusBadge tone={ASSIGNMENT_TONE[status] ?? "plain"}>{getAssignmentStatusLabel(status)}</StatusBadge>
);

const INBOX_TONE: Record<string, BadgeTone> = {
  RECEIVED: "notreq",
  PROCESSING: "notreq",
  MATCHED: "approved",
  NEEDS_REVIEW: "review",
  UNMATCHED: "missing",
  FAILED: "rejected",
  DUPLICATE: "expiring",
  RESOLVED: "notreq",
};

export const InboxStatusBadge: FC<{ status: string }> = ({ status }) => <StatusBadge tone={INBOX_TONE[status] ?? "plain"}>{getInboxStatusLabel(status)}</StatusBadge>;

const CONFIDENCE_TONE: Record<string, BadgeTone> = { HIGH: "approved", MEDIUM: "review", LOW: "rejected" };

export const ConfidenceBadge: FC<{ confidence: string | null; score?: number | null }> = ({ confidence, score }) =>
  confidence ? (
    <StatusBadge tone={CONFIDENCE_TONE[confidence] ?? "plain"} title={score !== null && score !== undefined ? `Score ${score.toFixed(2)}` : undefined}>
      {getConfidenceLabel(confidence)} confidence
    </StatusBadge>
  ) : null;

const NOTIFICATION_TONE: Record<string, BadgeTone> = { PENDING: "notreq", SENT: "approved", DELIVERED: "approved", FAILED: "rejected", CANCELLED: "notreq" };

export const NotificationStatusBadge: FC<{ status: string }> = ({ status }) => (
  <StatusBadge tone={NOTIFICATION_TONE[status] ?? "plain"}>{getNotificationStatusLabel(status)}</StatusBadge>
);

const PORTAL_TONE: Record<string, BadgeTone> = { active: "approved", invited: "invited", not_invited: "notreq", disabled: "notreq" };

export const PortalStatusBadge: FC<{ status: string }> = ({ status }) => <StatusBadge tone={PORTAL_TONE[status] ?? "plain"}>{getPortalStatusLabel(status)}</StatusBadge>;

const FORM_TONE: Record<string, BadgeTone> = { DRAFT: "notreq", PUBLISHED: "approved", ARCHIVED: "notreq" };

export const FormStatusBadge: FC<{ status: string }> = ({ status }) => <StatusBadge tone={FORM_TONE[status] ?? "plain"}>{getFormStatusLabel(status)}</StatusBadge>;

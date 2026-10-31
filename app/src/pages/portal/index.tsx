import type { FC } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SegmentedProgress, StatCard } from "@/components/ui/page-elements";
import { AssignmentStatusBadge, RequirementStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import { usePortalMe, usePortalOverview } from "@/features/portal/hooks/use-portal";
import type { PortalAction } from "@/features/portal/interfaces/portal.interfaces";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate, formatDeadline } from "@/lib/format";

/** Plain-language next step, e.g. "Your identification document is missing." (resolved at call time, so it follows the active language) */
export function actionSentence(a: PortalAction): { title: string; detail: string } {
  const o = { ns: "portal" } as const;
  const name = i18n.language?.startsWith("el") ? a.name : a.name.toLowerCase();
  switch (a.kind) {
    case "rejected":
      return {
        title: i18n.t("actions.rejected.title", { ...o, name }),
        detail: a.rejection_reason ? i18n.t("actions.rejected.detailReason", { ...o, reason: a.rejection_reason }) : i18n.t("actions.rejected.detail", { ...o, form: a.form_name }),
      };
    case "expired":
      return { title: i18n.t("actions.expired.title", { ...o, name, date: formatDate(a.expiration_date) }), detail: i18n.t("actions.expired.detail", o) };
    case "missing":
      return {
        title: i18n.t("actions.missing.title", { ...o, name }),
        detail: a.deadline ? i18n.t("actions.missing.detailDeadline", { ...o, date: formatDeadline(a.deadline), form: a.form_name }) : i18n.t("actions.missing.detail", { ...o, form: a.form_name }),
      };
    case "expiring": {
      const d = daysUntil(a.expiration_date);
      return {
        title: i18n.t("actions.expiring.title", { ...o, name, date: formatDate(a.expiration_date) }),
        detail: `${d !== null ? `${i18n.t("actions.expiring.inDays", { ...o, count: d })} ` : ""}${i18n.t("actions.expiring.detail", o)}`,
      };
    }
    default:
      return { title: i18n.t("actions.awaiting.title", { ...o, name }), detail: i18n.t("actions.awaiting.detail", o) };
  }
}

const PortalOverviewPage: FC = () => {
  const { t } = useTranslation("portal");
  const me = usePortalMe();
  const overview = usePortalOverview();
  const o = overview.data;
  const next = o?.next_actions.find((a) => a.kind !== "awaiting_review");
  return (
    <>
      <div className="portal-hero">
        <p className="eyebrow">{me.data ? t("overview.eyebrow", { org: me.data.organization.name }) : " "}</p>
        <h1 className="mt-2">{me.data ? t("overview.welcomeBack", { name: me.data.client.first_name }) : t("overview.welcomeBackNoName")}</h1>
        <p className="muted mt-2 text-[16px]">{me.data?.organization.welcome_message || t("overview.defaultWelcome")}</p>
      </div>

      {!o ? (
        <Skeleton className="mt-6 h-28 rounded-xl" />
      ) : next ? (
        <section className="card coral next-action mt-6">
          <span className="ico">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="grow">
            <p className="eyebrow" style={{ color: "rgba(255,255,255,.75)" }}>
              {t("overview.nextStep")}
            </p>
            <h2>{actionSentence(next).title}</h2>
            <p className="opacity-90">{actionSentence(next).detail}</p>
          </div>
          <Button asChild className="bg-[var(--g-canvas)] text-[var(--g-ink)] hover:bg-white">
            <Link to={Routes.portal.form(next.assignment_id)}>{next.kind === "expiring" ? t("overview.view") : t("overview.uploadNow")}</Link>
          </Button>
        </section>
      ) : (
        <section className="card cream next-action mt-6">
          <span className="ico !bg-[var(--g-success-tint)] text-[var(--g-success-ink)]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="!text-[var(--g-ink)]">{t("overview.allSet")}</h2>
            <p className="muted">{t("overview.nothingWaiting")}</p>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <section className="card pad">
          <div className="flex items-center justify-between">
            <h3>{t("overview.overallProgress")}</h3>
            <span className="num text-[36px]">{o?.progress.percent ?? 0}%</span>
          </div>
          <SegmentedProgress large className="mt-4" total={o?.progress.total || 1} ok={o?.progress.approved ?? 0} review={o?.progress.awaiting_review ?? 0} bad={(o?.progress.expired ?? 0) + (o?.progress.rejected ?? 0)} />
          <p className="muted mt-4">{o ? t("overview.documentsComplete", { approved: o.progress.approved, total: o.progress.total }) : " "}</p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <StatCard label={t("overview.missing")} value={o ? o.progress.missing + o.progress.rejected : "—"} tone={o && o.progress.missing + o.progress.rejected ? "alert" : undefined} />
          <StatCard label={t("overview.awaitingReview")} value={o?.progress.awaiting_review ?? "—"} tone={o?.progress.awaiting_review ? "warn" : undefined} />
          <StatCard label={t("overview.expired")} value={o?.progress.expired ?? "—"} tone={o?.progress.expired ? "alert" : undefined} />
          <StatCard label={t("overview.expiringSoon")} value={o?.progress.expiring_soon ?? "—"} tone={o?.progress.expiring_soon ? "warn" : undefined} />
        </section>
      </div>

      <h2 className="mb-4 mt-8">{t("overview.attentionTitle")}</h2>
      <section className="card">
        {!o ? (
          <Skeleton className="m-4 h-24" />
        ) : !o.next_actions.length ? (
          <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={t("overview.attentionEmptyTitle")} description={t("overview.attentionEmptyDescription")} />
        ) : (
          o.next_actions.map((a) => {
            const s = actionSentence(a);
            const problem = a.kind === "rejected" || a.kind === "expired" || a.kind === "missing";
            return (
              <div key={a.assignment_requirement_id} className={cn("req-card", (a.kind === "rejected" || a.kind === "expired") && "problem")}>
                <div>
                  <div className="title">
                    {a.name} <RequirementStatusBadge status={a.status} expiringSoon={a.kind === "expiring"} />
                  </div>
                  <p className="instr">
                    {s.title} {s.detail}
                  </p>
                </div>
                {a.kind !== "awaiting_review" && (
                  <Button asChild variant={problem ? "default" : "outline"}>
                    <Link to={Routes.portal.form(a.assignment_id)}>
                      {problem && <Upload />}
                      {a.kind === "expiring" ? t("overview.view") : a.kind === "missing" ? t("overview.upload") : t("overview.uploadNew")}
                    </Link>
                  </Button>
                )}
              </div>
            );
          })
        )}
      </section>

      <h2 className="mb-4 mt-8">{t("overview.formsTitle")}</h2>
      {!o ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : !o.forms.length ? (
        <div className="card">
          <EmptyState title={t("overview.noFormsTitle")} description={t("overview.noFormsDescription")} />
        </div>
      ) : (
        <div className="gr c2 stack-sm">
          {o.forms.map((f) => (
            <Link key={f.id} to={Routes.portal.form(f.id)} className="card cream pad clickable flex flex-col gap-3" style={{ color: "inherit" }}>
              <div className="flex items-start justify-between gap-2">
                <h3>{f.title}</h3>
                <AssignmentStatusBadge status={f.status} />
              </div>
              <SegmentedProgress total={f.requirements_total || 1} ok={f.requirements_completed} bad={f.requirements_expired} />
              <span className="caption">
                {t("overview.percentComplete", { percent: f.progress_percent })}
                {f.requirements_missing ? ` · ${t("overview.missingCount", { count: f.requirements_missing })}` : ""}
                {f.requirements_expired ? ` · ${t("overview.expiredCount", { count: f.requirements_expired })}` : ""}
                {f.deadline ? ` · ${t("overview.dueOn", { date: formatDeadline(f.deadline) })}` : ""}
              </span>
              {f.response_status === "SUBMITTED" && <StatusBadge tone="approved" className="self-start">{t("overview.answersSubmitted")}</StatusBadge>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default PortalOverviewPage;

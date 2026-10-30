import type { FC } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SegmentedProgress, StatCard } from "@/components/ui/page-elements";
import { AssignmentStatusBadge, RequirementStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import { usePortalMe, usePortalOverview } from "@/features/portal/hooks/use-portal";
import type { PortalAction } from "@/features/portal/interfaces/portal.interfaces";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate } from "@/lib/format";

/** Plain-language next step, e.g. "Your identification document is missing." */
export function actionSentence(a: PortalAction): { title: string; detail: string } {
  switch (a.kind) {
    case "rejected":
      return { title: `Please re-upload your ${a.name.toLowerCase()}.`, detail: a.rejection_reason ? `Reason: ${a.rejection_reason}` : `Your last upload for “${a.form_name}” could not be accepted.` };
    case "expired":
      return { title: `Your ${a.name.toLowerCase()} expired on ${formatDate(a.expiration_date)}.`, detail: "Upload a renewed copy to keep your file up to date." };
    case "missing":
      return { title: `Your ${a.name.toLowerCase()} is missing.`, detail: a.deadline ? `Please upload it by ${formatDate(a.deadline)} · ${a.form_name}` : `Requested in “${a.form_name}”.` };
    case "expiring": {
      const d = daysUntil(a.expiration_date);
      return { title: `Your ${a.name.toLowerCase()} expires on ${formatDate(a.expiration_date)}.`, detail: `${d !== null ? `In ${d} days. ` : ""}Upload the renewed copy when you have it.` };
    }
    default:
      return { title: `Your ${a.name.toLowerCase()} is awaiting approval.`, detail: "We are reviewing it — nothing to do for now." };
  }
}

const PortalOverviewPage: FC = () => {
  const me = usePortalMe();
  const overview = usePortalOverview();
  const o = overview.data;
  const next = o?.next_actions.find((a) => a.kind !== "awaiting_review");
  return (
    <>
      <div className="portal-hero">
        <p className="eyebrow">{me.data ? `${me.data.organization.name} · Client portal` : " "}</p>
        <h1 className="mt-2">Welcome back{me.data ? `, ${me.data.client.first_name}` : ""}</h1>
        <p className="muted mt-2 text-[16px]">{me.data?.organization.welcome_message || "Everything we need from you is on this page."}</p>
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
              Next step
            </p>
            <h2>{actionSentence(next).title}</h2>
            <p className="opacity-90">{actionSentence(next).detail}</p>
          </div>
          <Button asChild className="bg-[var(--g-canvas)] text-[var(--g-ink)] hover:bg-white">
            <Link to={Routes.portal.form(next.assignment_id)}>{next.kind === "expiring" ? "View" : "Upload now"}</Link>
          </Button>
        </section>
      ) : (
        <section className="card cream next-action mt-6">
          <span className="ico !bg-[var(--g-success-tint)] text-[var(--g-success-ink)]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="!text-[var(--g-ink)]">You are all set.</h2>
            <p className="muted">There is nothing waiting for you right now.</p>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <section className="card pad">
          <div className="flex items-center justify-between">
            <h3>Overall progress</h3>
            <span className="num text-[36px]">{o?.progress.percent ?? 0}%</span>
          </div>
          <SegmentedProgress large className="mt-4" total={o?.progress.total || 1} ok={o?.progress.approved ?? 0} review={o?.progress.awaiting_review ?? 0} bad={(o?.progress.expired ?? 0) + (o?.progress.rejected ?? 0)} />
          <p className="muted mt-4">{o ? `${o.progress.approved} of ${o.progress.total} documents are complete.` : " "}</p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Missing" value={o ? o.progress.missing + o.progress.rejected : "—"} tone={o && o.progress.missing + o.progress.rejected ? "alert" : undefined} />
          <StatCard label="Awaiting review" value={o?.progress.awaiting_review ?? "—"} tone={o?.progress.awaiting_review ? "warn" : undefined} />
          <StatCard label="Expired" value={o?.progress.expired ?? "—"} tone={o?.progress.expired ? "alert" : undefined} />
          <StatCard label="Expiring soon" value={o?.progress.expiring_soon ?? "—"} tone={o?.progress.expiring_soon ? "warn" : undefined} />
        </section>
      </div>

      <h2 className="mb-4 mt-8">What needs your attention</h2>
      <section className="card">
        {!o ? (
          <Skeleton className="m-4 h-24" />
        ) : !o.next_actions.length ? (
          <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Nothing needs your attention" description="We will email you when something new is requested." />
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
                      {a.kind === "expiring" ? "View" : a.kind === "missing" ? "Upload" : "Upload new"}
                    </Link>
                  </Button>
                )}
              </div>
            );
          })
        )}
      </section>

      <h2 className="mb-4 mt-8">Your forms</h2>
      {!o ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : !o.forms.length ? (
        <div className="card">
          <EmptyState title="No forms yet" description="Forms your provider shares with you appear here." />
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
                {f.progress_percent}% complete
                {f.requirements_missing ? ` · ${f.requirements_missing} missing` : ""}
                {f.requirements_expired ? ` · ${f.requirements_expired} expired` : ""}
                {f.deadline ? ` · due ${formatDate(f.deadline)}` : ""}
              </span>
              {f.response_status === "SUBMITTED" && <StatusBadge tone="approved" className="self-start">Answers submitted</StatusBadge>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default PortalOverviewPage;

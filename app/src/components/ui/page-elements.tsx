import type { FC, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { avatarTone, initials } from "@/lib/format";

/** Page title block with optional breadcrumbs and actions. */
export const PageHeader: FC<{
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  crumbs?: Array<{ label: string; to?: string }>;
  actions?: ReactNode;
  className?: string;
}> = ({ title, description, eyebrow, crumbs, actions, className }) => (
  <>
    {crumbs && crumbs.length > 0 && (
      <nav className="crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
          </span>
        ))}
      </nav>
    )}
    <div className={cn("page-head", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className={cn(eyebrow && "mt-2")}>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </>
);

export const StatCard: FC<{ label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: "alert" | "warn"; to?: string; icon?: ReactNode }> = ({ label, value, sub, tone, to, icon }) => {
  const content = (
    <>
      <span className="label">
        {icon}
        {label}
      </span>
      <span className="value">{value}</span>
      {sub && <span className="sub">{sub}</span>}
    </>
  );
  return to ? (
    <Link to={to} className={cn("card stat clickable", tone)} style={{ color: "inherit" }}>
      {content}
    </Link>
  ) : (
    <div className={cn("card stat", tone)}>{content}</div>
  );
};

/** Segmented progress bar: approved / review / problem. */
export const SegmentedProgress: FC<{ total: number; ok: number; review?: number; bad?: number; large?: boolean; className?: string }> = ({ total, ok, review = 0, bad = 0, large, className }) => {
  const pct = (n: number) => (total ? `${Math.min(100, (n / total) * 100)}%` : "0%");
  return (
    <div className={cn("progress", large && "lg", className)} role="progressbar" aria-valuenow={total ? Math.round((ok / total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
      <span className="ok" style={{ width: pct(ok) }} />
      <span className="rev" style={{ width: pct(review) }} />
      <span className="bad" style={{ width: pct(bad) }} />
    </div>
  );
};

export const ProgressCell: FC<{ percent: number; review?: number; bad?: number }> = ({ percent, review = 0, bad = 0 }) => (
  <div className="progress-cell">
    <SegmentedProgress total={100} ok={percent} review={review} bad={bad} />
    <span className="pct">{percent}%</span>
  </div>
);

export const EmptyState: FC<{ icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }> = ({ icon, title, description, action }) => (
  <div className="empty">
    <div className="ico">{icon ?? <Inbox className="h-5 w-5" />}</div>
    <h3>{title}</h3>
    {description && <p className="mx-auto max-w-md">{description}</p>}
    {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
  </div>
);

export const InitialsAvatar: FC<{ name: string; size?: "sm" | "lg"; className?: string }> = ({ name, size, className }) => (
  <span className={cn("avatar", size, avatarTone(name), className)} aria-hidden>
    {initials(name)}
  </span>
);

export const FileIcon: FC<{ format?: string | null; className?: string }> = ({ format, className }) => (
  <span className={cn("file-ico", className)}>{format === "IMAGE" ? "IMG" : format === "WORD" ? "DOC" : format === "EXCEL" ? "XLS" : format ? format : "—"}</span>
);

export const TableSkeleton: FC<{ rows?: number; className?: string }> = ({ rows = 6, className }) => (
  <div className={cn("flex flex-col gap-2 p-4", className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-10 w-full rounded-lg" />
    ))}
  </div>
);

export const CardsSkeleton: FC<{ count?: number; className?: string }> = ({ count = 5, className }) => (
  <div className={cn("gr", className)} style={{ gridTemplateColumns: `repeat(${Math.min(count, 5)}, minmax(0, 1fr))` }}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-24 rounded-xl" />
    ))}
  </div>
);

export const DetailSkeleton: FC = () => (
  <div className="flex flex-col gap-4">
    <Skeleton className="h-10 w-72 rounded-lg" />
    <Skeleton className="h-5 w-96 rounded" />
    <div className="gr main-side mt-4">
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  </div>
);

export const BrandLogo: FC<{ className?: string; to?: string }> = ({ className, to }) => {
  const inner = (
    <>
      <svg viewBox="0 0 24 24" fill="none" stroke="#cc785c" strokeWidth="2.4" strokeLinecap="round" className="h-[22px] w-[22px]" aria-hidden>
        <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" />
      </svg>
      <span className="brand-name">Gatherly</span>
    </>
  );
  return to ? (
    <Link to={to} className={cn("brand", className)}>
      {inner}
    </Link>
  ) : (
    <span className={cn("brand", className)}>{inner}</span>
  );
};

/** Card with a header row. */
export const Panel: FC<{ title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; pad?: boolean }> = ({ title, actions, children, className, bodyClassName, pad }) => (
  <section className={cn("card", className)}>
    {(title || actions) && (
      <div className="card-head">
        {typeof title === "string" ? <h3>{title}</h3> : title}
        {actions}
      </div>
    )}
    <div className={cn(pad && "card-body", bodyClassName)}>{children}</div>
  </section>
);

import { useEffect, useState, type FC } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, CheckCircle2, CircleSlash, Inbox as InboxIcon, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/ui/page-elements";
import { ConfidenceBadge, InboxStatusBadge, RequirementStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { useClientRequirements, useClients, useInbox, useInboxItem, useResolveInboxItem } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import type { InboxItem } from "@/features/inbox/interfaces/inbox.interfaces";
import { UploadSourceFilterOptions } from "@/config/constants/dropdowns/documents/upload-source-filter.options";
import { ConfidenceFilterOptions } from "@/config/constants/dropdowns/documents/confidence-filter.options";
import { InboxStatusFilterOptions } from "@/config/constants/dropdowns/documents/inbox-status-filter.options";
import { getUploadSourceLabel } from "@/config/constants/dropdowns/documents/upload-source-form.options";
import { getRequirementStatusLabel } from "@/config/constants/dropdowns/documents/requirement-status-form.options";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/lib/format";
import { DocumentPreview } from "@/pages/shared/components/document-preview";
import { RejectDialog } from "@/pages/shared/components/review-dialogs";

const ItemRow: FC<{ item: InboxItem; active: boolean; onClick: () => void }> = ({ item, active, onClick }) => (
  <button className={cn("inbox-item w-full text-left", active && "active")} onClick={onClick} aria-current={active}>
    <div className="grow min-w-0">
      <div className="top">
        <span className="cell-main truncate">{item.detected_document_type ?? item.document?.original_filename ?? "Document"}</span>
        <span className="caption whitespace-nowrap">{formatRelative(item.received_at)}</span>
      </div>
      <div className="cell-sub truncate">
        {item.client ? item.client.name : <span className="text-[var(--g-warning-ink)]">Unidentified client</span>} · {item.document?.original_filename}
      </div>
      <div className="meta">
        <StatusBadge tone="employee">{getUploadSourceLabel(item.source)}</StatusBadge>
        <InboxStatusBadge status={item.processing_status} />
        {item.confidence && item.confidence !== "HIGH" && <ConfidenceBadge confidence={item.confidence} score={item.confidence_score} />}
      </div>
    </div>
  </button>
);

const InboxPage: FC = () => {
  const [params, setParams] = useSearchParams();
  const { can, isOwnerOrAdmin } = useWorkspace();
  const [view, setView] = useState<"needs_review" | "processed" | "all">("needs_review");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [clientFilter, setClientFilter] = useState(params.get("client") ?? "all");
  const selectedId = params.get("item");
  const inbox = useInbox({ view, source, status, confidence, client_id: clientFilter, limit: 100 });
  const item = useInboxItem(selectedId);
  const resolve = useResolveInboxItem();
  const clients = useClients({ limit: 200, status: "ACTIVE" });
  const [rejecting, setRejecting] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changeClient, setChangeClient] = useState("");
  const [changeReq, setChangeReq] = useState("");
  const requirements = useClientRequirements(changing ? changeClient : null);

  const select = (id: string | null) => {
    if (id) params.set("item", id);
    else params.delete("item");
    setParams(params, { replace: true });
  };

  // Auto-select the first item.
  useEffect(() => {
    if (!selectedId && inbox.data?.data.length) select(inbox.data.data[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox.data, selectedId]);

  const counts = inbox.data?.counts;
  const d = item.data;
  const doc = d?.document;
  const linked = !!doc?.assignment_requirement_id;
  const canReview = can(Permissions.DOCUMENTS_REVIEW);
  const needsApproval = d?.needs_review && linked && d.requires_approval && doc?.review_status === "PENDING";
  const needsMatch = d?.needs_review && !linked;

  const act = (action: "approve" | "confirm" | "dismiss", extra: Record<string, string> = {}) =>
    d &&
    resolve.mutate(
      { id: d.id, action, ...extra },
      {
        onSuccess: () => {
          setDismissing(false);
          if (view === "needs_review" && action !== "confirm") {
            const next = inbox.data?.data.find((x) => x.id !== d.id);
            select(next?.id ?? null);
          }
        },
      },
    );

  const clientOptions = [
    { id: "all", label: "All clients" },
    ...(isOwnerOrAdmin ? [{ id: "unidentified", label: "Unidentified" }] : []),
    ...(clients.data?.data ?? []).map((c) => ({ id: c.id, label: `${c.first_name} ${c.last_name}` })),
  ];

  return (
    <>
      <PageHeader title="Document Inbox" description="Every incoming document in one place. Review what needs approval or matching first." />
      <div className="inbox">
        <section className="card inbox-list">
          <div className="tabs !m-0 px-2" role="tablist">
            {(
              [
                ["needs_review", "Needs review", counts?.needs_review],
                ["processed", "Processed", counts?.processed],
                ["all", "All", counts?.all],
              ] as const
            ).map(([v, label, n]) => (
              <button key={v} role="tab" aria-selected={view === v} className={cn("tab", view === v && "active")} onClick={() => setView(v)}>
                {label} {n !== undefined && <span className="n">{n}</span>}
              </button>
            ))}
          </div>
          <div className="toolbar !px-3 !py-2.5">
            <FilterSelect label="Source" value={source} onChange={setSource} options={UploadSourceFilterOptions} className="min-w-[120px]" />
            <FilterSelect label="Client" value={clientFilter} onChange={setClientFilter} options={clientOptions} className="min-w-[120px]" />
            <FilterSelect label="Processing status" value={status} onChange={setStatus} options={InboxStatusFilterOptions} className="min-w-[120px]" />
            <FilterSelect label="Confidence" value={confidence} onChange={setConfidence} options={ConfidenceFilterOptions} className="min-w-[120px]" />
          </div>
          <div className="inbox-items">
            {inbox.isPending ? (
              <TableSkeleton rows={6} />
            ) : !inbox.data?.data.length ? (
              <EmptyState
                icon={<CheckCircle2 className="h-5 w-5" />}
                title={view === "needs_review" ? "Nothing needs review" : "No documents yet"}
                description={view === "needs_review" ? "New uploads that need approval or matching appear here." : "Documents from the client portal and employee uploads appear here."}
              />
            ) : (
              inbox.data.data.map((i) => <ItemRow key={i.id} item={i} active={i.id === selectedId} onClick={() => select(i.id)} />)
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          {!selectedId ? (
            <div className="card">
              <EmptyState icon={<InboxIcon className="h-5 w-5" />} title="Select a document" description="Choose an item on the left to preview it next to its match details." />
            </div>
          ) : item.isPending ? (
            <>
              <Skeleton className="h-[460px] rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </>
          ) : !d || !doc ? (
            <div className="callout bad">{item.error?.message ?? "This item is not available."}</div>
          ) : (
            <>
              <div className="card pad flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate">{d.detected_document_type ?? doc.original_filename}</h2>
                  <p className="muted mt-1">
                    Received {formatDateTime(d.received_at)} · {getUploadSourceLabel(d.source)}
                    {doc.uploaded_by_type !== "system" ? ` · by ${doc.uploaded_by_name}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {needsApproval && canReview && (
                    <>
                      <Button variant="outline" onClick={() => setRejecting(true)}>
                        <X />
                        Reject
                      </Button>
                      <Button loading={resolve.isPending && resolve.variables?.action === "approve"} onClick={() => act("approve")}>
                        <Check />
                        Approve
                      </Button>
                    </>
                  )}
                  {needsMatch && canReview && (
                    <>
                      <Button variant="ghost" onClick={() => setDismissing(true)}>
                        <CircleSlash />
                        Dismiss
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setChangeClient(d.client?.id ?? "");
                          setChangeReq(d.suggested_requirement?.id ?? "");
                          setChanging(true);
                        }}
                      >
                        <Link2 />
                        Change match
                      </Button>
                      {d.suggested_requirement && (
                        <Button loading={resolve.isPending && resolve.variables?.action === "confirm"} onClick={() => act("confirm")}>
                          <Check />
                          Confirm match
                        </Button>
                      )}
                    </>
                  )}
                  {!d.needs_review && <StatusBadge tone="approved">{d.review_action ? `Resolved · ${d.review_action.toLowerCase()}` : "Processed automatically"}</StatusBadge>}
                </div>
              </div>

              <DocumentPreview documentId={doc.id} filename={doc.original_filename} format={doc.file_format} sizeBytes={doc.size_bytes} height={460} />

              <div className="gr c2">
                <section className="card pad">
                  <h3 className="mb-3">Match</h3>
                  <dl className="kv">
                    <dt>Client</dt>
                    <dd>{d.client ? <Link to={Routes.clients.detail(d.client.id)}>{d.client.name}</Link> : <span className="text-[var(--g-warning-ink)]">Unidentified</span>}</dd>
                    <dt>Document type</dt>
                    <dd>{d.detected_document_type ?? "—"}</dd>
                    <dt>Assignment</dt>
                    <dd>{d.suggested_assignment ? <Link to={Routes.assignments.detail(d.suggested_assignment.id)}>{d.suggested_assignment.form_name}</Link> : "—"}</dd>
                    <dt>Requirement</dt>
                    <dd>
                      {d.suggested_requirement ? (
                        <span className="flex flex-wrap items-center gap-2">
                          {d.suggested_requirement.name}
                          <RequirementStatusBadge status={d.suggested_requirement.status} />
                        </span>
                      ) : (
                        "—"
                      )}
                    </dd>
                    <dt>Status</dt>
                    <dd>
                      <InboxStatusBadge status={d.processing_status} />
                    </dd>
                  </dl>
                </section>
                <section className="card pad">
                  <h3 className="mb-3">Confidence</h3>
                  <div className="score">
                    <ConfidenceBadge confidence={d.confidence} />
                    <div className="bar">
                      <span style={{ width: `${Math.round((d.confidence_score ?? 0) * 100)}%`, background: d.confidence === "LOW" ? "var(--g-error)" : d.confidence === "MEDIUM" ? "var(--g-amber)" : undefined }} />
                    </div>
                    <span className="mono">{(d.confidence_score ?? 0).toFixed(2)}</span>
                  </div>
                  <ul className="signals mt-3">
                    {d.match_signals.map((s, i) => (
                      <li key={i}>
                        <Check className="icon h-3.5 w-3.5" />
                        <span>
                          {s.detail ?? s.signal} <span className="caption">({s.weight >= 0 ? "+" : ""}{s.weight})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {d.is_ambiguous && <p className="callout warn mt-3">This document could belong to more than one client. It is never attached automatically.</p>}
                  {d.public_submission && (
                    <div className="mt-3">
                      <span className="label">Public portal submission (unverified)</span>
                      <p className="muted">
                        {d.public_submission.submitter_name} · {d.public_submission.submitter_email}
                        {d.public_submission.submitter_company ? ` · ${d.public_submission.submitter_company}` : ""}
                      </p>
                      <p className="caption">Form: {d.public_submission.form.name}</p>
                    </div>
                  )}
                  {d.reviewed_at && (
                    <p className="caption mt-3">
                      Reviewed by {d.reviewed_by} · {formatDateTime(d.reviewed_at)}
                      {d.review_note ? ` · “${d.review_note}”` : ""}
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
        </section>
      </div>

      {d && (
        <>
          <RejectDialog
            open={rejecting}
            onOpenChange={setRejecting}
            documentName={d.detected_document_type ?? "this document"}
            pending={resolve.isPending}
            onConfirm={(reason) => resolve.mutate({ id: d.id, action: "reject", reason }, { onSuccess: () => setRejecting(false) })}
          />
          <ConfirmationDialog
            isOpen={dismissing}
            onClose={() => setDismissing(false)}
            title="Dismiss this document?"
            description="It is not attached to any client and leaves the review list. The file stays in the processing history."
            confirmText="Dismiss"
            isLoading={resolve.isPending}
            onConfirm={() => act("dismiss")}
          />
          <Dialog open={changing} onOpenChange={(o) => !resolve.isPending && setChanging(o)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="display text-[26px] font-medium">Change match</DialogTitle>
                <DialogDescription>Link the document to the client requirement it satisfies.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="field">
                  <Label>Client</Label>
                  <FilterSelect
                    label="Client"
                    size="default"
                    className="w-full"
                    placeholder="Select a client"
                    value={changeClient}
                    onChange={(v) => {
                      setChangeClient(v);
                      setChangeReq("");
                    }}
                    options={(clients.data?.data ?? []).map((c) => ({ id: c.id, label: `${c.first_name} ${c.last_name}${c.company ? ` · ${c.company}` : ""}` }))}
                  />
                </div>
                <div className="field">
                  <Label>Assignment &amp; requirement</Label>
                  <FilterSelect
                    label="Requirement"
                    size="default"
                    className="w-full"
                    placeholder={changeClient && requirements.data && !requirements.data.length ? "This client has no assigned forms" : "Select a requirement"}
                    disabled={!changeClient}
                    value={changeReq}
                    onChange={setChangeReq}
                    options={(requirements.data ?? []).map((r) => ({ id: r.id, label: `${r.form_name} › ${r.name} (${getRequirementStatusLabel(r.status)})` }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setChanging(false)}>
                  Cancel
                </Button>
                <Button
                  loading={resolve.isPending}
                  disabled={!changeReq}
                  onClick={() => resolve.mutate({ id: d.id, action: "change", assignment_requirement_id: changeReq }, { onSuccess: () => setChanging(false) })}
                >
                  Link document
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
};

export default InboxPage;

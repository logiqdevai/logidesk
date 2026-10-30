import { useState, type FC } from "react";
import { Check, Eye, History, MoreHorizontal, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileIcon } from "@/components/ui/page-elements";
import { RequirementStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import type { AssignmentRequirement } from "@/features/assignments/interfaces/assignments.interfaces";
import { FileFormatFormOptions } from "@/config/constants/dropdowns/documents/file-format-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { daysUntil, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DownloadButton } from "@/pages/shared/components/document-preview";

interface RequirementCardProps {
  requirement: AssignmentRequirement;
  canUpload: boolean;
  canReview: boolean;
  canManage: boolean;
  reviewPending?: boolean;
  onUpload: () => void;
  onPreview: (documentId: string) => void;
  onApprove: (documentId: string) => void;
  onReject: (documentId: string) => void;
  onSettings: () => void;
  onToggleRequired: () => void;
}

/** One document requirement with its current submission, history and actions. */
export const RequirementCard: FC<RequirementCardProps> = ({ requirement: r, canUpload, canReview, canManage, reviewPending, onUpload, onPreview, onApprove, onReject, onSettings, onToggleRequired }) => {
  const [showHistory, setShowHistory] = useState(false);
  const current = r.current_documents[0];
  const days = daysUntil(current?.expiration_date);
  const expiringSoon = r.status === "APPROVED" && days !== null && days >= 0 && days <= 30;
  const problem = r.status === "MISSING" || r.status === "REJECTED" || r.status === "EXPIRED";
  return (
    <div className={cn("req-card", problem && r.is_required && "problem", r.status === "NOT_REQUIRED" && "opacity-60")}>
      <div className="min-w-0">
        <div className="title">
          {r.name}
          {r.is_required ? <span className="text-[var(--g-error)]">*</span> : <span className="caption font-normal">(optional)</span>}
          <RequirementStatusBadge status={r.status} expiringSoon={expiringSoon} />
        </div>
        {r.description && <p className="instr">{r.description}</p>}
        {r.instructions && <p className="instr italic">{r.instructions}</p>}
        <div className="meta caption">
          <span>{r.accepted_formats.map((f) => getDropdownOptionLabel(FileFormatFormOptions, f)).join(", ")} · up to {r.max_file_size_mb} MB</span>
          {r.effective_deadline && <span>Due {formatDate(r.effective_deadline)}{r.deadline ? " (own deadline)" : ""}</span>}
          {!r.requires_approval && <span>No approval needed</span>}
          {r.not_required_reason && <span>Not required: {r.not_required_reason}</span>}
          {r.reminder && <span title="Effective reminder schedule">{r.reminder.summary}</span>}
        </div>
        {r.current_documents.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {r.current_documents.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-[var(--g-surface-soft)] px-3 py-2">
                <FileIcon format={d.file_format} />
                <div className="grow min-w-0">
                  <button className="cell-main block truncate text-left hover:underline" onClick={() => onPreview(d.id)}>
                    {d.original_filename}
                  </button>
                  <div className="cell-sub">
                    {d.uploaded_by_type === "client" ? "Uploaded by the client" : `Uploaded by ${d.uploaded_by_name}`} · {formatDateTime(d.uploaded_at)}
                    {d.expiration_date && ` · expires ${formatDate(d.expiration_date)}`}
                    {d.reviewed_by_name && ` · ${d.review_status === "APPROVED" ? "approved" : "reviewed"} by ${d.reviewed_by_name}`}
                  </div>
                  {d.rejection_reason && <div className="text-[12.5px] text-[var(--g-error-ink)]">Rejected: {d.rejection_reason}</div>}
                  {d.duplicate_of && <StatusBadge tone="expiring" className="mt-1">Identical to a file already on record</StatusBadge>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => onPreview(d.id)}>
                  <Eye />
                  Preview
                </Button>
                <DownloadButton documentId={d.id} />
              </div>
            ))}
          </div>
        )}
        {r.history.length > 0 && (
          <button className="link-btn mt-2 flex items-center gap-1 text-[13px]" onClick={() => setShowHistory((s) => !s)}>
            <History className="h-3.5 w-3.5" />
            {showHistory ? "Hide" : "Show"} {r.history.length} earlier submission{r.history.length === 1 ? "" : "s"}
          </button>
        )}
        {showHistory && (
          <ul className="mt-2 flex flex-col gap-1">
            {r.history.map((d) => (
              <li key={d.id} className="caption flex items-center gap-2">
                <button className="hover:underline" onClick={() => onPreview(d.id)}>
                  {d.original_filename}
                </button>
                · {formatDate(d.uploaded_at)} · {d.review_status.toLowerCase()} · replaced {formatDate(d.superseded_at)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canReview && current && current.review_status === "PENDING" && r.status === "UNDER_REVIEW" && (
          <>
            <Button size="sm" variant="outline" onClick={() => onReject(current.id)}>
              <X />
              Reject
            </Button>
            <Button size="sm" loading={reviewPending} onClick={() => onApprove(current.id)}>
              <Check />
              Approve
            </Button>
          </>
        )}
        {r.status === "SUBMITTED" && <span className="caption">Processing…</span>}
        {canUpload && r.status !== "NOT_REQUIRED" && (
          <Button size="sm" variant={current ? "outline" : "default"} onClick={onUpload}>
            <Upload />
            {current ? "Replace" : "Upload"}
          </Button>
        )}
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label={`More actions for ${r.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onSettings}>Deadline &amp; reminders…</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onToggleRequired}>{r.status === "NOT_REQUIRED" ? "Mark as required again" : "Mark as not required"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

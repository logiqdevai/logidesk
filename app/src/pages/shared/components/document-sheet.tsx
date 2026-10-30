import { useEffect, useState, type FC } from "react";
import { Link } from "react-router-dom";
import { Check, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirementStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useDeleteDocument, useDocument, useReviewDocument, useUpdateDocument } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { getUploadSourceLabel } from "@/config/constants/dropdowns/documents/upload-source-form.options";
import { getReviewStatusLabel } from "@/config/constants/dropdowns/documents/review-status-form.options";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { Routes } from "@/routes/routes";
import { DocumentPreview } from "./document-preview";
import { RejectDialog } from "./review-dialogs";

const CHANGE_LABEL: Record<string, string> = {
  CREATED: "Uploaded",
  FILE_REPLACED: "File replaced",
  METADATA_UPDATED: "Details edited",
  EXPIRATION_CHANGED: "Expiration changed",
  REVIEW_CHANGED: "Review updated",
  RESTORED: "Restored",
};

/** Document detail: preview, metadata, expiration editing, review and change history. */
export const DocumentSheet: FC<{ documentId: string | null; onClose: () => void }> = ({ documentId, onClose }) => {
  const doc = useDocument(documentId);
  const { can } = useWorkspace();
  const review = useReviewDocument();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expiration, setExpiration] = useState("");

  useEffect(() => setExpiration(doc.data?.expiration_date ?? ""), [doc.data?.expiration_date]);

  const d = doc.data;
  const canReview = can(Permissions.DOCUMENTS_REVIEW) && d?.is_current && !!d.requirement && d.review_status === "PENDING" && d.processed;
  return (
    <Sheet open={!!documentId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="display text-[26px] font-medium">{d?.title ?? "Document"}</SheetTitle>
          <SheetDescription>{d ? `${d.original_filename} · ${formatBytes(d.size_bytes)}` : " "}</SheetDescription>
        </SheetHeader>
        {doc.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-32" />
          </div>
        ) : !d ? (
          <p className="callout bad m-4">{doc.error?.message ?? "Document not found"}</p>
        ) : (
          <div className="flex flex-col gap-5 px-4 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              {d.requirement && <RequirementStatusBadge status={d.is_current ? d.requirement.status : "REPLACED"} />}
              <StatusBadge tone="plain">{getUploadSourceLabel(d.source)}</StatusBadge>
              {!d.is_verified && <StatusBadge tone="expiring">Unverified</StatusBadge>}
              {d.duplicate_of && <StatusBadge tone="expiring">Duplicate file</StatusBadge>}
            </div>
            {canReview && (
              <div className="callout warn items-center">
                <span className="grow">This submission is waiting for approval.</span>
                <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
                  <X />
                  Reject
                </Button>
                <Button size="sm" loading={review.isPending} onClick={() => review.mutate({ id: d.id, decision: "APPROVED" })}>
                  <Check />
                  Approve
                </Button>
              </div>
            )}
            <DocumentPreview documentId={d.id} filename={d.original_filename} format={d.file_format} sizeBytes={d.size_bytes} height={420} />
            <dl className="kv">
              <dt>Client</dt>
              <dd>{d.client ? <Link to={Routes.clients.detail(d.client.id)}>{d.client.name}</Link> : "Unidentified"}</dd>
              <dt>Form</dt>
              <dd>{d.requirement ? <Link to={Routes.assignments.detail(d.requirement.assignment_id)}>{d.requirement.form.name}</Link> : "—"}</dd>
              <dt>Uploaded</dt>
              <dd>
                {formatDateTime(d.uploaded_at)} by {d.uploaded_by_name}
              </dd>
              <dt>Review</dt>
              <dd>
                {getReviewStatusLabel(d.review_status)}
                {d.reviewed_by_name ? ` by ${d.reviewed_by_name}` : ""}
                {d.reviewed_at ? ` · ${formatDate(d.reviewed_at)}` : ""}
                {d.rejection_reason && <div className="text-[var(--g-error-ink)]">“{d.rejection_reason}”</div>}
              </dd>
              <dt>Expiration</dt>
              <dd>
                {d.expiration_date ? formatDate(d.expiration_date) : "No expiration"}
                {d.expiration_source && <span className="caption"> · {d.expiration_source.toLowerCase()}</span>}
              </dd>
            </dl>
            {can(Permissions.DOCUMENTS_UPLOAD) && d.is_current && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="field">
                  <Label htmlFor="doc-exp">Expiration date</Label>
                  <Input id="doc-exp" type="date" className="w-48" value={expiration} onChange={(e) => setExpiration(e.target.value)} />
                </div>
                <Button
                  variant="outline"
                  loading={update.isPending}
                  disabled={(expiration || null) === d.expiration_date}
                  onClick={() => update.mutate({ id: d.id, expiration_date: expiration || null })}
                >
                  Save expiration
                </Button>
              </div>
            )}
            <div>
              <h3 className="mb-2">History</h3>
              <ul className="timeline">
                {d.versions.map((v) => (
                  <li key={v.id}>
                    <span className="ico">{v.version_number}</span>
                    <div>
                      <div>
                        <b className="ink">{CHANGE_LABEL[v.change_type] ?? v.change_type}</b> · {getReviewStatusLabel(v.review_status)}
                        {v.expiration_date ? ` · expires ${formatDate(v.expiration_date)}` : ""}
                      </div>
                      <div className="when">
                        {formatDateTime(v.created_at)} · {v.changed_by}
                        {v.change_reason ? ` · ${v.change_reason}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {can(Permissions.DOCUMENTS_DELETE) && (
              <div className="border-t pt-4">
                <Button variant="outline" className="text-[var(--g-error-ink)]" onClick={() => setDeleting(true)}>
                  <Trash2 />
                  Delete document
                </Button>
              </div>
            )}
          </div>
        )}
        {d && (
          <>
            <RejectDialog
              open={rejecting}
              onOpenChange={setRejecting}
              documentName={d.title}
              pending={review.isPending}
              onConfirm={(reason) => review.mutate({ id: d.id, decision: "REJECTED", reason }, { onSuccess: () => setRejecting(false) })}
            />
            <ConfirmationDialog
              isOpen={deleting}
              onClose={() => setDeleting(false)}
              variant="destructive"
              title="Delete this document?"
              description="The submission is removed from the client's file. If it was the current file, the previous submission becomes current again; otherwise the requirement goes back to Missing. The action is recorded in the audit log."
              confirmText="Delete"
              isLoading={remove.isPending}
              onConfirm={() =>
                remove.mutate(d.id, {
                  onSuccess: () => {
                    setDeleting(false);
                    onClose();
                  },
                })
              }
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

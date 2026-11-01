import { DatePicker } from "@/components/ui/date-picker";
import { useEffect, useState, type FC } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RequirementStatusBadge,
  StatusBadge,
} from "@/components/ui/status-badge";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import {
  useDeleteDocument,
  useDocument,
  useReviewDocument,
  useUpdateDocument,
} from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { getUploadSourceLabel } from "@/config/constants/dropdowns/documents/upload-source-form.options";
import { getReviewStatusLabel } from "@/config/constants/dropdowns/documents/review-status-form.options";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { Routes } from "@/routes/routes";
import { DocumentPreview } from "./document-preview";
import { RejectDialog } from "./review-dialogs";

/** Document detail: preview, metadata, expiration editing, review and change history. */
export const DocumentSheet: FC<{
  documentId: string | null;
  onClose: () => void;
}> = ({ documentId, onClose }) => {
  const { t } = useTranslation("documents");
  const doc = useDocument(documentId);
  const { can } = useWorkspace();
  const review = useReviewDocument();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expiration, setExpiration] = useState("");

  useEffect(
    () => setExpiration(doc.data?.expiration_date ?? ""),
    [doc.data?.expiration_date],
  );

  const d = doc.data;
  const canReview =
    can(Permissions.DOCUMENTS_REVIEW) &&
    d?.is_current &&
    !!d.requirement &&
    d.review_status === "PENDING" &&
    d.processed;
  return (
    <Sheet open={!!documentId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="display text-[26px] font-medium">
            {d?.title ?? t("sheet.document")}
          </SheetTitle>
          <SheetDescription>
            {d ? `${d.original_filename} · ${formatBytes(d.size_bytes)}` : " "}
          </SheetDescription>
        </SheetHeader>
        {doc.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-32" />
          </div>
        ) : !d ? (
          <p className="callout bad m-4">
            {doc.error?.message ?? t("sheet.notFound")}
          </p>
        ) : (
          <div className="flex flex-col gap-5 px-4 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              {d.requirement && (
                <RequirementStatusBadge
                  status={d.is_current ? d.requirement.status : "REPLACED"}
                />
              )}
              <StatusBadge tone="plain">
                {getUploadSourceLabel(d.source)}
              </StatusBadge>
              {!d.is_verified && (
                <StatusBadge tone="expiring">
                  {t("sheet.unverified")}
                </StatusBadge>
              )}
              {d.duplicate_of && (
                <StatusBadge tone="expiring">
                  {t("sheet.duplicateFile")}
                </StatusBadge>
              )}
            </div>
            {canReview && (
              <div className="callout warn items-center">
                <span className="grow">{t("sheet.waitingApproval")}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejecting(true)}
                >
                  <X />
                  {t("sheet.reject")}
                </Button>
                <Button
                  size="sm"
                  loading={review.isPending}
                  onClick={() =>
                    review.mutate({ id: d.id, decision: "APPROVED" })
                  }
                >
                  <Check />
                  {t("sheet.approve")}
                </Button>
              </div>
            )}
            <DocumentPreview
              documentId={d.id}
              filename={d.original_filename}
              format={d.file_format}
              sizeBytes={d.size_bytes}
              height={420}
            />
            <dl className="divide-y divide-[var(--g-hairline)] rounded-lg border border-[var(--g-hairline)] px-4">
              <DocRow label={t("sheet.client")}>
                {d.client ? (
                  <Link to={Routes.clients.detail(d.client.id)}>
                    {d.client.name}
                  </Link>
                ) : (
                  t("sheet.unidentified")
                )}
              </DocRow>
              <DocRow label={t("sheet.form")}>
                {d.requirement ? (
                  <Link
                    to={Routes.assignments.detail(d.requirement.assignment_id)}
                  >
                    {d.requirement.form.name}
                  </Link>
                ) : (
                  "—"
                )}
              </DocRow>
              <DocRow label={t("sheet.uploaded")}>
                {t("sheet.uploadedBy", {
                  date: formatDateTime(d.uploaded_at),
                  name: d.uploaded_by_name,
                })}
              </DocRow>
              <DocRow label={t("sheet.review")}>
                {getReviewStatusLabel(d.review_status)}
                {d.reviewed_by_name
                  ? ` ${t("sheet.by", { name: d.reviewed_by_name })}`
                  : ""}
                {d.reviewed_at ? ` · ${formatDate(d.reviewed_at)}` : ""}
                {d.rejection_reason && (
                  <div className="text-[var(--g-error-ink)]">
                    “{d.rejection_reason}”
                  </div>
                )}
              </DocRow>
              <DocRow label={t("sheet.expiration")}>
                {d.expiration_date
                  ? formatDate(d.expiration_date)
                  : t("sheet.noExpiration")}
                {d.expiration_source && (
                  <span className="caption">
                    {" "}
                    ·{" "}
                    {t(`sheet.expirationSource.${d.expiration_source}`, {
                      defaultValue: d.expiration_source.toLowerCase(),
                    })}
                  </span>
                )}
              </DocRow>
            </dl>
            {can(Permissions.DOCUMENTS_UPLOAD) && d.is_current && (
              <div className="rounded-lg border border-[var(--g-hairline)] bg-[var(--g-surface-card)] p-4">
                <Label htmlFor="doc-exp">{t("sheet.expirationDate")}</Label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <DatePicker
                    id="doc-exp"
                    className="w-full sm:w-56"
                    value={expiration}
                    onChange={setExpiration}
                  />
                  <Button
                    variant="outline"
                    loading={update.isPending}
                    disabled={(expiration || null) === d.expiration_date}
                    onClick={() =>
                      update.mutate({
                        id: d.id,
                        expiration_date: expiration || null,
                      })
                    }
                  >
                    {t("sheet.saveExpiration")}
                  </Button>
                </div>
              </div>
            )}
            <div>
              <h3 className="mb-2">{t("sheet.history")}</h3>
              <ul className="timeline">
                {d.versions.map((v) => (
                  <li key={v.id}>
                    <span className="ico">{v.version_number}</span>
                    <div>
                      <div>
                        <b className="ink">
                          {t(`sheet.change.${v.change_type}`, {
                            defaultValue: v.change_type,
                          })}
                        </b>{" "}
                        · {getReviewStatusLabel(v.review_status)}
                        {v.expiration_date
                          ? ` · ${t("sheet.expires", { date: formatDate(v.expiration_date) })}`
                          : ""}
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
                <Button
                  variant="ghost"
                  className="bg-[var(--g-error-tint)] text-[var(--g-error-ink)] hover:bg-[#f0d0cb] hover:text-[var(--g-error-ink)]"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 />
                  {t("sheet.deleteDocument")}
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
              onConfirm={(reason) =>
                review.mutate(
                  { id: d.id, decision: "REJECTED", reason },
                  { onSuccess: () => setRejecting(false) },
                )
              }
            />
            <ConfirmationDialog
              isOpen={deleting}
              onClose={() => setDeleting(false)}
              variant="destructive"
              title={t("sheet.deleteTitle")}
              description={t("sheet.deleteDescription")}
              confirmText={t("common.delete")}
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

function DocRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <dt className="text-[12px] font-medium uppercase tracking-wide text-[var(--g-muted)]">
        {label}
      </dt>
      <dd className="m-0 mt-1 text-[16px] text-[var(--g-ink)]">{children}</dd>
    </div>
  );
}

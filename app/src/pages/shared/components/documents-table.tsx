import { useEffect, useState, type FC } from "react";
import { Link } from "react-router-dom";
import { FileText, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState, FileIcon, TableSkeleton } from "@/components/ui/page-elements";
import { RequirementStatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { useClientAssignments, useDocuments, useForms, useReviewDocument } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import type { DocumentRow } from "@/features/documents/interfaces/documents.interfaces";
import { RequirementStatusFilterOptions } from "@/config/constants/dropdowns/documents/requirement-status-filter.options";
import { ExpirationFilterOptions } from "@/config/constants/dropdowns/documents/expiration-filter.options";
import { UploadedFilterOptions } from "@/config/constants/dropdowns/documents/uploaded-filter.options";
import { UploadSourceFilterOptions } from "@/config/constants/dropdowns/documents/upload-source-filter.options";
import { Routes } from "@/routes/routes";
import { daysUntil, formatDate } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounced";
import { DocumentSheet } from "./document-sheet";
import { RejectDialog } from "./review-dialogs";
import { UploadDialog } from "./upload-dialog";

interface DocumentsTableProps {
  clientId?: string;
  initialStatus?: string;
}

/** Expected documents with their current file; filterable by type, form, status, expiration, upload date. */
export const DocumentsTable: FC<DocumentsTableProps> = ({ clientId, initialStatus }) => {
  const { can } = useWorkspace();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState(initialStatus ?? "all");
  const [formId, setFormId] = useState("all");
  const [docType, setDocType] = useState("all");
  const [expiration, setExpiration] = useState("any");
  const [uploaded, setUploaded] = useState("any");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<DocumentRow | null>(null);
  const [uploadFor, setUploadFor] = useState<DocumentRow | null>(null);
  const review = useReviewDocument();
  const forms = useForms({ limit: 200, status: "all" });
  const clientAssignments = useClientAssignments(clientId);

  useEffect(() => setStatus(initialStatus ?? "all"), [initialStatus]);
  useEffect(() => setPage(1), [debounced, status, formId, docType, expiration, uploaded, source]);

  const docs = useDocuments({
    client_id: clientId,
    search: debounced,
    status,
    form_id: formId,
    document_type: docType,
    expiration,
    uploaded,
    source,
    page,
    limit: 25,
  });

  const formOptions = clientId
    ? [{ id: "all", label: "All forms" }, ...Array.from(new Map((clientAssignments.data ?? []).map((a) => [a.form_id, { id: a.form_id, label: a.form_name }])).values())]
    : [{ id: "all", label: "All forms" }, ...(forms.data?.data ?? []).map((f) => ({ id: f.id, label: f.name }))];
  const typeOptions = [{ id: "all", label: "All document types" }, ...(docs.data?.document_types ?? []).map((t) => ({ id: t, label: t }))];
  const rows = docs.data?.data ?? [];
  const pg = docs.data?.pagination;
  const filtered = debounced || status !== "all" || formId !== "all" || docType !== "all" || expiration !== "any" || uploaded !== "any" || source !== "all";

  return (
    <section className="card">
      <div className="toolbar">
        <div className="search">
          <Search className="icon h-4 w-4" />
          <Input aria-label="Search documents" className="h-8 pl-9 text-[13px]" placeholder={clientId ? "Search documents" : "Search documents, files or clients"} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <FilterSelect label="Document type" value={docType} onChange={setDocType} options={typeOptions} />
        <FilterSelect label="Form" value={formId} onChange={setFormId} options={formOptions} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={RequirementStatusFilterOptions} />
        <FilterSelect label="Expiration" value={expiration} onChange={setExpiration} options={ExpirationFilterOptions} />
        <FilterSelect label="Upload date" value={uploaded} onChange={setUploaded} options={UploadedFilterOptions} />
        {!clientId && <FilterSelect label="Source" value={source} onChange={setSource} options={UploadSourceFilterOptions} />}
      </div>
      {docs.isPending ? (
        <TableSkeleton rows={8} />
      ) : docs.isError ? (
        <div className="callout bad m-4">{docs.error.message}</div>
      ) : !rows.length ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title={filtered ? "No documents match your filters" : "No documents requested yet"}
          description={filtered ? "Try clearing some filters." : "Assign a form to a client and the documents it requests appear here."}
        />
      ) : (
        <div className="table-wrap">
          <Table className="table">
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                {!clientId && <TableHead>Client</TableHead>}
                <TableHead>Form</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const d = r.document;
                const days = daysUntil(d?.expiration_date);
                const canReview = can(Permissions.DOCUMENTS_REVIEW) && d && d.review_status === "PENDING" && r.status === "UNDER_REVIEW";
                return (
                  <TableRow key={r.assignment_requirement_id} className={d ? "clickable" : undefined} onClick={() => d && setOpenDoc(d.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileIcon format={d?.file_format} />
                        <div className="min-w-0">
                          <div className="cell-main truncate">{r.name}</div>
                          <div className="cell-sub truncate">{d ? d.original_filename : r.is_required ? "Not yet submitted" : "Optional · not submitted"}</div>
                        </div>
                      </div>
                    </TableCell>
                    {!clientId && (
                      <TableCell>
                        <Link to={Routes.clients.detail(r.client.id)} className="cell-main block" onClick={(e) => e.stopPropagation()}>
                          {r.client.name}
                        </Link>
                        <span className="cell-sub">{r.client.company ?? ""}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <Link to={Routes.assignments.detail(r.assignment_id)} onClick={(e) => e.stopPropagation()} className="text-[var(--g-body)] hover:text-[var(--g-ink)]">
                        {r.form.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <RequirementStatusBadge status={r.status} expiringSoon={r.expiring_soon} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {d?.expiration_date ? (
                        <>
                          {formatDate(d.expiration_date)}
                          {days !== null && days >= 0 && days <= 30 && <div className="cell-sub">in {days} days</div>}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {d ? (
                        <>
                          {formatDate(d.uploaded_at)}
                          <div className="cell-sub">{d.uploaded_by_type === "client" ? "by client" : d.uploaded_by_name}</div>
                        </>
                      ) : r.deadline ? (
                        <span className="cell-sub">Due {formatDate(r.deadline)}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="actions" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canReview && (
                          <Button size="sm" loading={review.isPending && review.variables?.id === d!.id} onClick={() => review.mutate({ id: d!.id, decision: "APPROVED" })}>
                            Approve
                          </Button>
                        )}
                        {!d && can(Permissions.DOCUMENTS_UPLOAD) && r.status !== "NOT_REQUIRED" && (
                          <Button size="sm" variant="outline" onClick={() => setUploadFor(r)}>
                            Upload
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label={`Actions for ${r.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {d && <DropdownMenuItem onSelect={() => setOpenDoc(d.id)}>Preview &amp; details</DropdownMenuItem>}
                            <DropdownMenuItem asChild>
                              <Link to={Routes.assignments.detail(r.assignment_id)}>View full form</Link>
                            </DropdownMenuItem>
                            {can(Permissions.DOCUMENTS_UPLOAD) && r.status !== "NOT_REQUIRED" && (
                              <DropdownMenuItem onSelect={() => setUploadFor(r)}>{d ? "Replace file" : "Upload on behalf"}</DropdownMenuItem>
                            )}
                            {canReview && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-[var(--g-error-ink)]" onSelect={() => setRejecting(r)}>
                                  Reject…
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {pg && pg.total > 0 && (
        <div className="table-foot">
          <span>
            {(pg.page - 1) * pg.limit + 1}–{Math.min(pg.page * pg.limit, pg.total)} of {pg.total}
          </span>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!pg.has_prev} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={!pg.has_next} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </span>
        </div>
      )}
      <DocumentSheet documentId={openDoc} onClose={() => setOpenDoc(null)} />
      {rejecting?.document && (
        <RejectDialog
          open
          onOpenChange={(o) => !o && setRejecting(null)}
          documentName={rejecting.name}
          pending={review.isPending}
          onConfirm={(reason) => review.mutate({ id: rejecting.document!.id, decision: "REJECTED", reason }, { onSuccess: () => setRejecting(null) })}
        />
      )}
      <UploadDialog
        open={!!uploadFor}
        onOpenChange={(o) => !o && setUploadFor(null)}
        clientId={uploadFor?.client.id}
        clientName={uploadFor?.client.name}
        assignmentId={uploadFor?.assignment_id}
        requirementId={uploadFor?.assignment_requirement_id}
      />
    </section>
  );
};

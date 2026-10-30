import { useEffect, useMemo, useState, type FC } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetailSkeleton, FileIcon, SegmentedProgress } from "@/components/ui/page-elements";
import { AssignmentStatusBadge, RequirementStatusBadge } from "@/components/ui/status-badge";
import { Dropzone, acceptFor } from "@/components/ui/dropzone";
import { usePortalForm, usePortalUpload, useSavePortalAnswers } from "@/features/portal/hooks/use-portal";
import type { AssignmentRequirement } from "@/features/assignments/interfaces/assignments.interfaces";
import { FileFormatFormOptions } from "@/config/constants/dropdowns/documents/file-format-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import type { ApiError } from "@/lib/api-error";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { FormRenderer, missingRequired } from "@/pages/shared/components/form-renderer";
import { DownloadButton } from "@/pages/shared/components/document-preview";

const REPLACEABLE = ["MISSING", "REJECTED", "EXPIRED"];

const PortalRequirement: FC<{ r: AssignmentRequirement; onUpload: () => void }> = ({ r, onUpload }) => {
  const current = r.current_documents[0];
  const canUpload = r.status !== "NOT_REQUIRED" && (REPLACEABLE.includes(r.status) || r.allow_multiple_submissions);
  return (
    <div className={cn("req-card", (r.status === "REJECTED" || r.status === "EXPIRED") && "problem")}>
      <div className="min-w-0">
        <div className="title">
          {r.name}
          {r.is_required ? <span className="text-[var(--g-error)]">*</span> : <span className="caption font-normal">(optional)</span>}
          <RequirementStatusBadge status={r.status} />
        </div>
        {r.description && <p className="instr">{r.description}</p>}
        {r.instructions && <p className="instr">{r.instructions}</p>}
        <div className="meta caption">
          <span>
            {r.accepted_formats.map((f) => getDropdownOptionLabel(FileFormatFormOptions, f)).join(", ")} · up to {r.max_file_size_mb} MB
          </span>
          {r.effective_deadline && <span>Due {formatDate(r.effective_deadline)}</span>}
        </div>
        {current && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-[var(--g-surface-soft)] px-3 py-2">
            <FileIcon format={current.file_format} />
            <div className="grow min-w-0">
              <div className="cell-main truncate">{current.original_filename}</div>
              <div className="cell-sub">
                Uploaded {formatDateTime(current.uploaded_at)}
                {current.uploaded_by_type === "employee" ? " by your provider" : ""}
                {current.expiration_date ? ` · expires ${formatDate(current.expiration_date)}` : ""}
              </div>
              {r.status === "REJECTED" && current.rejection_reason && <div className="text-[12.5px] text-[var(--g-error-ink)]">Not accepted: {current.rejection_reason}</div>}
              {r.status === "UNDER_REVIEW" && <div className="caption">Awaiting approval</div>}
              {r.status === "SUBMITTED" && <div className="caption">Processing your upload…</div>}
            </div>
            <DownloadButton documentId={current.id} portal />
          </div>
        )}
      </div>
      {canUpload && (
        <Button onClick={onUpload} variant={current ? "outline" : "default"}>
          <Upload />
          {current ? (r.status === "REJECTED" || r.status === "EXPIRED" ? "Upload new" : "Replace") : "Upload"}
        </Button>
      )}
    </div>
  );
};

const PortalFormPage: FC = () => {
  const { id } = useParams();
  const form = usePortalForm(id);
  const save = useSavePortalAnswers();
  const upload = usePortalUpload();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [uploadFor, setUploadFor] = useState<AssignmentRequirement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const a = form.data;

  useEffect(() => {
    if (a && !dirty) {
      // Field defaults apply until the client answers.
      const defaults = Object.fromEntries(a.definition.sections.flatMap((s) => s.fields).filter((f) => f.default_value !== undefined && f.default_value !== null).map((f) => [f.id, f.default_value]));
      setAnswers({ ...defaults, ...a.response.answers });
    }
  }, [a, dirty]);

  const reqs = useMemo(() => new Map((a?.requirements ?? []).map((r) => [r.field_key, r])), [a]);

  if (form.isPending) return <DetailSkeleton />;
  if (form.isError || !a) return <div className="callout bad">{form.error?.message ?? "Form not found"}</div>;

  const submitted = a.response.status === "SUBMITTED";
  const onSave = (submit: boolean) => {
    if (submit) {
      const missing = missingRequired(a.definition, answers);
      if (Object.keys(missing).length) {
        setErrors(missing);
        document.getElementById(`fld-${Object.keys(missing)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    save.mutate(
      { id: a.id, answers, submit },
      {
        onSuccess: () => {
          setErrors({});
          setDirty(false);
        },
        onError: (e) => setErrors((e as ApiError).fieldErrors ?? {}),
      },
    );
  };
  const active = a.requirements.filter((r) => r.status !== "NOT_REQUIRED");
  const missingDocs = active.filter((r) => r.is_required && ["MISSING", "REJECTED", "EXPIRED"].includes(r.status));

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={Routes.portal.forms}>My forms</Link>
        <span>›</span>
        <span>{a.title}</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>{a.title}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2">
            <AssignmentStatusBadge status={a.status} />
            {a.deadline && <span className="muted">Due {formatDate(a.deadline)}</span>}
            {a.response.last_saved_at && <span className="muted">· saved {formatDateTime(a.response.last_saved_at)}</span>}
          </p>
        </div>
      </div>
      {(a.description || a.instructions) && (
        <div className="card pad mb-4">
          {a.description && <p>{a.description}</p>}
          {a.instructions && <p className="muted mt-1 whitespace-pre-line">{a.instructions}</p>}
        </div>
      )}
      <div className="card pad mb-4">
        <div className="flex items-center justify-between">
          <span className="label">Progress</span>
          <span className="caption">
            {a.requirements_completed} of {a.requirements_total} documents complete
          </span>
        </div>
        <SegmentedProgress className="mt-2" total={active.length || 1} ok={active.filter((r) => r.status === "APPROVED").length} review={active.filter((r) => r.status === "UNDER_REVIEW" || r.status === "SUBMITTED").length} bad={active.filter((r) => r.status === "REJECTED" || r.status === "EXPIRED").length} />
      </div>
      {submitted && (
        <div className="callout ok mb-4">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            You submitted your answers on {formatDateTime(a.response.submitted_at)}. You can still update them{missingDocs.length ? " and upload the remaining documents" : ""}.
          </span>
        </div>
      )}

      <FormRenderer
        definition={a.definition}
        answers={answers}
        errors={errors}
        onChange={(k, v) => {
          setAnswers((x) => ({ ...x, [k]: v }));
          setDirty(true);
          if (errors[k]) setErrors(({ [k]: _removed, ...rest }) => rest);
        }}
        renderFile={(field) => {
          const r = reqs.get(field.id);
          return r ? <PortalRequirement r={r} onUpload={() => (setFiles([]), setUploadFor(r))} /> : null;
        }}
      />

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t bg-[var(--g-canvas)] py-4">
        <span className="caption">{missingDocs.length ? `${missingDocs.length} required document${missingDocs.length === 1 ? "" : "s"} still missing — you can upload them at any time.` : "All required documents are uploaded."}</span>
        <div className="flex gap-2">
          <Button variant="outline" loading={save.isPending && !save.variables?.submit} onClick={() => onSave(false)} disabled={!dirty}>
            Save draft
          </Button>
          <Button loading={save.isPending && !!save.variables?.submit} onClick={() => onSave(true)}>
            {submitted ? "Update answers" : "Submit form"}
          </Button>
        </div>
      </div>

      <Dialog open={!!uploadFor} onOpenChange={(o) => !upload.isPending && !o && setUploadFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="display text-[26px] font-medium">Upload {uploadFor?.name}</DialogTitle>
            <DialogDescription>{uploadFor?.instructions || uploadFor?.description || "Your file is stored securely and only shared with your provider."}</DialogDescription>
          </DialogHeader>
          {uploadFor && (
            <Dropzone
              files={files}
              onChange={setFiles}
              maxFiles={uploadFor.max_files}
              accept={acceptFor(uploadFor.accepted_formats)}
              hint={`${uploadFor.accepted_formats.map((f) => getDropdownOptionLabel(FileFormatFormOptions, f)).join(", ")} · up to ${uploadFor.max_file_size_mb} MB`}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadFor(null)} disabled={upload.isPending}>
              Cancel
            </Button>
            <Button loading={upload.isPending} disabled={!files.length} onClick={() => uploadFor && upload.mutate({ id: a.id, requirementId: uploadFor.id, files }, { onSuccess: () => setUploadFor(null) })}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PortalFormPage;

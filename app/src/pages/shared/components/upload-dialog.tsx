import { DatePicker } from "@/components/ui/date-picker";
import { useEffect, useMemo, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterSelect } from "@/components/ui/filter-select";
import { Dropzone, acceptFor } from "@/components/ui/dropzone";
import { useAssignment, useClientAssignments, useClients, useUploadDocument } from "@/features/workspace/hooks/use-workspace-data";
import { FileFormatFormOptions } from "@/config/constants/dropdowns/documents/file-format-form.options";
import { getRequirementStatusLabel } from "@/config/constants/dropdowns/documents/requirement-status-form.options";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
  assignmentId?: string;
  requirementId?: string;
}

/** Employee upload on the client's behalf (recorded as uploaded by the employee). */
export const UploadDialog: FC<UploadDialogProps> = ({ open, onOpenChange, clientId: fixedClient, clientName, assignmentId: fixedAssignment, requirementId: fixedRequirement }) => {
  const { t } = useTranslation("documents");
  const [clientId, setClientId] = useState(fixedClient ?? "");
  const [assignmentId, setAssignmentId] = useState(fixedAssignment ?? "");
  const [requirementId, setRequirementId] = useState(fixedRequirement ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [expiration, setExpiration] = useState("");
  const clients = useClients({ limit: 200, status: "ACTIVE" });
  const assignments = useClientAssignments(clientId || undefined);
  const assignment = useAssignment(assignmentId || undefined);
  const upload = useUploadDocument();

  useEffect(() => {
    if (open) {
      setClientId(fixedClient ?? "");
      setAssignmentId(fixedAssignment ?? "");
      setRequirementId(fixedRequirement ?? "");
      setFiles([]);
      setExpiration("");
    }
  }, [open, fixedClient, fixedAssignment, fixedRequirement]);

  const activeAssignments = (assignments.data ?? []).filter((a) => !a.cancelled_at);
  useEffect(() => {
    if (!assignmentId && activeAssignments.length === 1) setAssignmentId(activeAssignments[0].id);
  }, [activeAssignments, assignmentId]);

  const requirements = useMemo(() => (assignment.data?.requirements ?? []).filter((r) => r.status !== "NOT_REQUIRED"), [assignment.data]);
  useEffect(() => {
    if (!requirementId && requirements.length) setRequirementId((requirements.find((r) => r.status === "MISSING") ?? requirements[0]).id);
  }, [requirements, requirementId]);
  const requirement = requirements.find((r) => r.id === requirementId);

  const submit = () =>
    upload.mutate(
      { assignment_requirement_id: requirementId, files, expiration_date: expiration || undefined },
      { onSuccess: () => onOpenChange(false) },
    );

  const name = clientName ?? clients.data?.data.find((c) => c.id === clientId)?.first_name;
  return (
    <Dialog open={open} onOpenChange={(o) => !upload.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="display text-[26px] font-medium">{name ? t("upload.titleFor", { name }) : t("upload.title")}</DialogTitle>
          <DialogDescription>{t("upload.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {!fixedClient && (
            <div className="field">
              <Label>{t("upload.client")}</Label>
              {clients.isPending ? (
                <Skeleton className="h-10" />
              ) : (
                <FilterSelect
                  label={t("upload.client")}
                  size="default"
                  className="w-full"
                  value={clientId}
                  placeholder={t("upload.selectClient")}
                  onChange={(v) => {
                    setClientId(v);
                    setAssignmentId("");
                    setRequirementId("");
                  }}
                  options={(clients.data?.data ?? []).map((c) => ({ id: c.id, label: `${c.first_name} ${c.last_name}${c.company ? ` · ${c.company}` : ""}` }))}
                />
              )}
            </div>
          )}
          <div className="form-grid">
            <div className="field">
              <Label>{t("upload.assignedForm")}</Label>
              <FilterSelect
                label={t("upload.assignedForm")}
                size="default"
                className="w-full"
                disabled={!clientId || !!fixedAssignment}
                value={assignmentId}
                placeholder={clientId && !activeAssignments.length && !assignments.isPending ? t("upload.noForms") : t("upload.selectForm")}
                onChange={(v) => {
                  setAssignmentId(v);
                  setRequirementId("");
                }}
                options={activeAssignments.map((a) => ({ id: a.id, label: a.form_name }))}
              />
            </div>
            <div className="field">
              <Label>{t("upload.requirement")}</Label>
              <FilterSelect
                label={t("upload.requirement")}
                size="default"
                className="w-full"
                disabled={!assignmentId || !!fixedRequirement}
                value={requirementId}
                placeholder={t("upload.selectRequirement")}
                onChange={setRequirementId}
                options={requirements.map((r) => ({ id: r.id, label: `${r.name} · ${getRequirementStatusLabel(r.status)}` }))}
              />
            </div>
          </div>
          <Dropzone
            files={files}
            onChange={setFiles}
            maxFiles={requirement?.max_files ?? 1}
            accept={requirement ? acceptFor(requirement.accepted_formats) : undefined}
            hint={
              requirement
                ? `${requirement.accepted_formats.map((f) => FileFormatFormOptions.find((o) => o.id === f)?.label).join(", ")} · ${t("upload.upToMb", { count: requirement.max_file_size_mb })}${requirement.max_files > 1 ? ` · ${t("upload.upToFiles", { count: requirement.max_files })}` : ""}`
                : t("upload.defaultHint")
            }
          />
          <div className="field max-w-xs">
            <Label htmlFor="upload-exp">
              {t("upload.expirationDate")} <span className="soft">({t("upload.optional")})</span>
            </Label>
            <DatePicker id="upload-exp" value={expiration} onChange={setExpiration} />
            <span className="hint">{t("upload.expirationHint")}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} loading={upload.isPending} disabled={!requirementId || !files.length}>
            {t("upload.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

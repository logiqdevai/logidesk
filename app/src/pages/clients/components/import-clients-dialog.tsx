import { useEffect, useMemo, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dropzone } from "@/components/ui/dropzone";
import { FilterSelect } from "@/components/ui/filter-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useImportClients, useInviteImportedClients, usePreviewClientImport } from "@/features/workspace/hooks/use-workspace-data";
import type { ClientImportField, ClientImportMapping, ClientImportPreview, ClientImportProblem, ClientImportResult, ClientImportSkippedRow, ClientImportWarning } from "@/features/clients/interfaces/clients.interfaces";
import { ClientImportFieldOptions, IMPORT_SKIP_COLUMN } from "@/config/constants/dropdowns/users/client-import-field.options";

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Column index -> customer field (or skip). The inverse of the API mapping, so a column can only feed one field. */
type ColumnFields = Record<number, ClientImportField | typeof IMPORT_SKIP_COLUMN>;

const toColumnFields = (preview: ClientImportPreview): ColumnFields => {
  const result: ColumnFields = {};
  for (const column of preview.columns) result[column.index] = IMPORT_SKIP_COLUMN;
  for (const [field, index] of Object.entries(preview.suggested_mapping)) result[index as number] = field as ClientImportField;
  return result;
};

const toMapping = (columnFields: ColumnFields): ClientImportMapping => {
  const mapping: ClientImportMapping = {};
  for (const [index, field] of Object.entries(columnFields)) if (field !== IMPORT_SKIP_COLUMN) mapping[field] = Number(index);
  return mapping;
};

/** Upload an Excel/CSV file, confirm which column feeds which customer field, then import. */
export const ImportClientsDialog: FC<ImportClientsDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation("clients");
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ClientImportPreview | null>(null);
  const [columnFields, setColumnFields] = useState<ColumnFields>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<ClientImportResult | null>(null);
  const [warnings, setWarnings] = useState<ClientImportWarning[]>([]);
  const previewMutation = usePreviewClientImport();
  const importMutation = useImportClients();
  const inviteMutation = useInviteImportedClients();
  const [invited, setInvited] = useState(false);
  const busy = previewMutation.isPending || importMutation.isPending || inviteMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setPreview(null);
    setColumnFields({});
    setSkipDuplicates(true);
    setResult(null);
    setWarnings([]);
    setInvited(false);
  }, [open]);

  const onFileChange = (next: File[]) => {
    setFiles(next);
    setPreview(null);
    setWarnings([]);
    if (!next[0]) return;
    previewMutation.mutate(next[0], {
      onSuccess: (data) => {
        setPreview(data);
        setColumnFields(toColumnFields(data));
      },
      onError: () => setFiles([]),
    });
  };

  const setColumnField = (index: number, field: string) => {
    setWarnings([]);
    setColumnFields((current) => {
      const next = { ...current };
      // A field has one source column: choosing it here releases it from any other column.
      if (field !== IMPORT_SKIP_COLUMN) for (const key of Object.keys(next)) if (next[Number(key)] === field) next[Number(key)] = IMPORT_SKIP_COLUMN;
      next[index] = field as ClientImportField;
      return next;
    });
  };

  const mapping = useMemo(() => toMapping(columnFields), [columnFields]);
  const hasName = mapping.full_name !== undefined || (mapping.first_name !== undefined && mapping.last_name !== undefined);
  const fieldChoices = [{ id: IMPORT_SKIP_COLUMN, label: t("import.skipColumn") }, ...ClientImportFieldOptions];

  const submit = () =>
    importMutation.mutate(
      { file: files[0], mapping, skip_duplicates: skipDuplicates, ignore_warnings: warnings.length > 0 },
      {
        onSuccess: (r) => {
          if (r.blocked) setWarnings(r.warnings);
          else setResult(r);
        },
      },
    );

  const fieldName = (field: ClientImportField) => t(`import.fieldShort.${field}`);
  const problemText = (p: ClientImportProblem) => t(`import.problem.${p.code}`, { field: fieldName(p.field), column: p.column, value: p.value });
  const warningText = (w: ClientImportWarning) => t(`import.warning.${w.code}`, { field: fieldName(w.field), column: w.column, valid: w.valid, total: w.total, example: w.example });
  const reasonLines = (row: ClientImportSkippedRow) => (row.reason === "INVALID" ? row.problems.map(problemText) : [t(`import.reason.${row.reason}`, { email: row.email })]);
  const notAdded = (result?.failed ?? 0) + (result?.skipped_duplicates ?? 0);

  const invitable = result?.invitable_client_ids ?? [];
  const invite = () => inviteMutation.mutate(invitable, { onSuccess: () => setInvited(true) });

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="display text-[26px] font-medium">{t("import.title")}</DialogTitle>
          <DialogDescription>{result ? t("import.resultDescription") : preview ? t("import.mapDescription", { count: preview.total_rows }) : t("import.uploadDescription")}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-4">
            <div className={`callout ${result.created ? "ok" : "warn"}`}>
              <div>
                <strong>{t("import.result.created", { count: result.created })}</strong>
                <div className="caption mt-1">
                  {t("import.result.summary", { total: result.total, skipped: result.skipped_duplicates, failed: result.failed })}
                </div>
              </div>
            </div>
            {invitable.length > 0 && !invited && <div className="caption">{t("import.invite.hint", { count: invitable.length })}</div>}
            {result.skipped.length > 0 && (
              <div className="flex flex-col gap-2">
                <strong>{t("import.result.notAddedTitle", { count: notAdded })}</strong>
                <div className="max-h-64 overflow-auto">
                  <Table className="table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("import.result.row")}</TableHead>
                        <TableHead>{t("import.result.contact")}</TableHead>
                        <TableHead>{t("import.result.why")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.skipped.map((row) => (
                        <TableRow key={row.row}>
                          <TableCell className="whitespace-nowrap align-top">{row.row}</TableCell>
                          <TableCell className="align-top">{row.contact || <span className="muted">{t("import.result.noContact")}</span>}</TableCell>
                          <TableCell className="align-top">
                            {reasonLines(row).map((line) => (
                              <div key={line}>{line}</div>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {result.skipped.length < notAdded && <div className="caption">{t("import.result.showingFirst", { count: result.skipped.length })}</div>}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Dropzone files={files} onChange={onFileChange} accept=".xlsx,.csv" hint={t("import.hint")} disabled={busy} compact />
            {previewMutation.isPending && <div className="caption">{t("import.reading")}</div>}
            {preview && (
              <>
                <div className="max-h-[320px] overflow-auto">
                  <Table className="table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("import.columns.column")}</TableHead>
                        <TableHead>{t("import.columns.examples")}</TableHead>
                        <TableHead>{t("import.columns.importAs")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.columns.map((c) => (
                        <TableRow key={c.index}>
                          <TableCell className="cell-main">{c.header}</TableCell>
                          <TableCell className="cell-sub max-w-[220px] truncate">{c.samples.join(", ") || "—"}</TableCell>
                          <TableCell>
                            <FilterSelect
                              label={t("import.columns.importAsFor", { name: c.header })}
                              size="default"
                              className="w-[200px]"
                              value={columnFields[c.index] ?? IMPORT_SKIP_COLUMN}
                              onChange={(v) => setColumnField(c.index, v)}
                              options={fieldChoices}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {!hasName && <div className="callout warn">{t("import.nameRequired")}</div>}
                {warnings.length > 0 && (
                  <div className="callout warn" role="alert">
                    <div className="flex flex-col gap-1">
                      <strong>{t("import.warning.title")}</strong>
                      {warnings.map((w) => (
                        <div key={w.field}>{warningText(w)}</div>
                      ))}
                      <div className="caption">{t("import.warning.footer")}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox id="import-skip-duplicates" checked={skipDuplicates} onCheckedChange={(c) => setSkipDuplicates(c === true)} />
                  <Label htmlFor="import-skip-duplicates">{t("import.skipDuplicates")}</Label>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <>
              {invitable.length > 0 && (
                <Button variant="outline" disabled={busy || invited} onClick={invite}>
                  <Send />
                  {inviteMutation.isPending ? t("import.invite.sending") : invited ? t("import.invite.sent") : t("import.invite.send")}
                </Button>
              )}
              <Button disabled={inviteMutation.isPending} onClick={() => onOpenChange(false)}>
                {t("import.done")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                {t("import.cancel")}
              </Button>
              <Button disabled={!preview || !hasName || busy} onClick={submit}>
                {importMutation.isPending ? t("import.importing") : warnings.length ? t("import.importAnyway") : t("import.submit", { count: preview?.total_rows ?? 0 })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

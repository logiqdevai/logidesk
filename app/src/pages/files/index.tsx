import { useEffect, useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Folder, FolderArchive, HardDrive, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FileIcon, PageHeader, TableSkeleton } from "@/components/ui/page-elements";
import { RequirementStatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { useExportStatus, useFolder, useRequestZip, useStorageSummary } from "@/features/workspace/hooks/use-workspace-data";
import { FileFormatFilterOptions } from "@/config/constants/dropdowns/documents/file-format-filter.options";
import { getFileFormatLabel } from "@/config/constants/dropdowns/documents/file-format-form.options";
import { formatBytes, formatDate } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounced";
import { DocumentSheet } from "@/pages/shared/components/document-sheet";
import { DownloadButton } from "@/pages/shared/components/document-preview";

/** Follows an EXPORTS job until the archive is ready, then offers the signed link. */
const ExportProgress: FC<{ exportId: string; onDone: () => void }> = ({ exportId, onDone }) => {
  const status = useExportStatus(exportId);
  const s = status.data;
  return (
    <div className="callout items-center">
      <FolderArchive className="h-5 w-5 shrink-0" />
      <div className="grow">
        {!s || ["QUEUED", "DELAYED", "ACTIVE", "RETRYING"].includes(s.status) ? (
          <>
            <div className="label">Preparing your .zip… {s?.progress ? `${s.progress}%` : ""}</div>
            <Progress value={s?.progress ?? 5} className="mt-2 h-1.5" />
          </>
        ) : s.status === "COMPLETED" ? (
          <div>
            <b className="ink">{s.filename}</b> is ready · {s.file_count} files · {formatBytes(s.size_bytes)} · available for 24 hours
          </div>
        ) : (
          <div className="text-[var(--g-error-ink)]">The export failed: {s.error}</div>
        )}
      </div>
      {s?.status === "COMPLETED" && s.url && (
        <Button size="sm" asChild>
          <a href={s.url} download>
            <Download />
            Download
          </a>
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onDone}>
        Close
      </Button>
    </div>
  );
};

const FilesPage: FC = () => {
  const [params, setParams] = useSearchParams();
  const clientId = params.get("client") ?? undefined;
  const assignmentId = params.get("folder") ?? undefined;
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [format, setFormat] = useState("all");
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [exportId, setExportId] = useState<string | null>(null);
  const folder = useFolder({ client_id: clientId, assignment_id: assignmentId, search: debounced, file_format: format });
  const summary = useStorageSummary();
  const zip = useRequestZip();

  useEffect(() => setSearch(""), [clientId, assignmentId]);

  const go = (client?: string, form?: string) => {
    const next = new URLSearchParams();
    if (client) next.set("client", client);
    if (form) next.set("folder", form);
    setParams(next);
  };

  const s = summary.data;
  const used = s ? (s.used_bytes / Math.max(1, s.limit_bytes)) * 100 : 0;
  const data = folder.data;

  return (
    <>
      <PageHeader
        title="File Space"
        description="Browse every file your organization stores, organized by client and form."
        actions={
          <Button
            variant="outline"
            loading={zip.isPending}
            onClick={() => zip.mutate({ client_id: clientId, assignment_id: assignmentId }, { onSuccess: (r) => setExportId(r.export_id) })}
          >
            <FolderArchive />
            Download {assignmentId ? "folder" : clientId ? "client folder" : "everything"} as .zip
          </Button>
        }
      />

      <section className="gr c4 mb-4">
        <div className="card stat col-span-2">
          <span className="label">
            <HardDrive className="h-3.5 w-3.5" /> Storage used
          </span>
          <span className="value">{s ? formatBytes(s.used_bytes) : "—"}</span>
          <Progress value={used} className="my-2 h-1.5" />
          <span className="sub">{s ? `${formatBytes(s.limit_bytes)} included in your plan · ${s.file_count} files` : " "}</span>
        </div>
        <div className="card stat col-span-2">
          <span className="label">By type</span>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
            {(s?.by_type ?? []).map((t) => (
              <div key={t.file_format} className="flex justify-between">
                <span>{getFileFormatLabel(t.file_format)}</span>
                <span className="muted">
                  {t.count} · {formatBytes(t.size_bytes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {exportId && (
        <div className="mb-4">
          <ExportProgress exportId={exportId} onDone={() => setExportId(null)} />
        </div>
      )}

      <section className="card">
        <div className="toolbar">
          <nav className="crumbs !mb-0" aria-label="Folder path">
            <button className="hover:text-[var(--g-ink)]" onClick={() => go()}>
              All clients
            </button>
            {data?.breadcrumbs.map((b) => (
              <span key={b.id} className="flex items-center gap-1.5">
                ›
                <button className="hover:text-[var(--g-ink)]" onClick={() => (b.type === "client" ? go(b.id) : go(clientId, b.id))}>
                  {b.name}
                </button>
              </span>
            ))}
          </nav>
          <span className="grow" />
          <div className="search">
            <Search className="icon h-4 w-4" />
            <Input aria-label="Search in this folder" className="h-8 pl-9 text-[13px]" placeholder="Search in this folder" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterSelect label="File type" value={format} onChange={setFormat} options={FileFormatFilterOptions} />
        </div>
        {folder.isPending ? (
          <TableSkeleton rows={6} />
        ) : folder.isError ? (
          <div className="callout bad m-4">{folder.error.message}</div>
        ) : !data?.folders.length && !data?.files.length ? (
          <EmptyState icon={<Folder className="h-5 w-5" />} title={debounced ? "Nothing matches your search" : "This folder is empty"} description="Files appear here as clients and employees upload documents." />
        ) : (
          <div className="table-wrap">
            <Table className="table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>{data?.level === "form" ? "Status" : "Items"}</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>{data?.level === "form" ? "Uploaded" : "Last modified"}</TableHead>
                  <TableHead className="actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.folders.map((f) => (
                  <TableRow key={f.id} className="clickable" onClick={() => (f.type === "client" ? go(f.id) : go(clientId, f.id))}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Folder className="h-5 w-5 text-[var(--g-primary)]" />
                        <div>
                          <div className="cell-main">{f.name}</div>
                          {f.subtitle && <div className="cell-sub">{f.subtitle}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{f.item_count} files</TableCell>
                    <TableCell>{formatBytes(f.size_bytes)}</TableCell>
                    <TableCell>{formatDate(f.last_modified)}</TableCell>
                    <TableCell className="actions" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Download ${f.name} as zip`}
                        onClick={() =>
                          zip.mutate(f.type === "client" ? { client_id: f.id } : { client_id: clientId, assignment_id: f.id }, { onSuccess: (r) => setExportId(r.export_id) })
                        }
                      >
                        <FolderArchive />
                        .zip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.files.map((f) => (
                  <TableRow key={f.id} className="clickable" onClick={() => setOpenDoc(f.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileIcon format={f.file_format} />
                        <div className="min-w-0">
                          <div className="cell-main truncate">{f.original_filename}</div>
                          <div className="cell-sub">
                            {f.title} · {getFileFormatLabel(f.file_format)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{f.requirement_status ? <RequirementStatusBadge status={f.requirement_status} /> : "—"}</TableCell>
                    <TableCell>{formatBytes(f.size_bytes)}</TableCell>
                    <TableCell>{formatDate(f.uploaded_at)}</TableCell>
                    <TableCell className="actions" onClick={(e) => e.stopPropagation()}>
                      <DownloadButton documentId={f.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
      <DocumentSheet documentId={openDoc} onClose={() => setOpenDoc(null)} />
    </>
  );
};

export default FilesPage;

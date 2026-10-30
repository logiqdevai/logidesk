import type { FC } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentUrl, useDownloadDocument } from "@/features/workspace/hooks/use-workspace-data";
import { usePortalDocumentUrl, usePortalDownloadDocument } from "@/features/portal/hooks/use-portal";
import type { FileFormat } from "@/features/documents/interfaces/documents.interfaces";
import { formatBytes } from "@/lib/format";

interface PreviewProps {
  documentId: string;
  filename: string;
  format: FileFormat;
  sizeBytes?: number;
  /** Portal principal uses the portal endpoints. */
  portal?: boolean;
  height?: number;
}

/** Inline preview through a short-lived signed URL (PDF and images); other types download. */
export const DocumentPreview: FC<PreviewProps> = ({ documentId, filename, format, sizeBytes, portal, height = 520 }) => {
  const workspaceUrl = useDocumentUrl(portal ? null : documentId, "inline");
  const portalUrl = usePortalDocumentUrl(portal ? documentId : null, "inline");
  const query = portal ? portalUrl : workspaceUrl;
  const url = query.data?.url;
  return (
    <div className="preview">
      <div className="preview-bar">
        <span className="truncate">
          {filename}
          {sizeBytes ? ` · ${formatBytes(sizeBytes)}` : ""}
        </span>
        <span className="flex gap-2">
          {url && (
            <Button size="sm" variant="secondary" asChild className="bg-[var(--g-surface-dark-elevated)] text-[var(--g-on-dark)] hover:bg-black">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open
              </a>
            </Button>
          )}
          <DownloadButton documentId={documentId} portal={portal} dark />
        </span>
      </div>
      {query.isPending ? (
        <Skeleton className="w-full rounded-md" style={{ height }} />
      ) : query.isError ? (
        <p className="py-10 text-center text-[var(--g-on-dark-soft)]">{query.error.message}</p>
      ) : format === "PDF" ? (
        <iframe title={`Preview of ${filename}`} src={url} className="w-full rounded-md bg-white" style={{ height }} />
      ) : format === "IMAGE" ? (
        <div className="grid place-items-center rounded-md bg-[var(--g-surface-dark-soft)] p-4" style={{ minHeight: Math.min(height, 360) }}>
          <img src={url} alt={filename} className="max-h-[520px] min-w-[96px] rounded-md bg-white object-contain [image-rendering:auto]" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-[var(--g-on-dark-soft)]">
          <FileText className="h-8 w-8" />
          <p>Preview is not available for this file type. Download it to open.</p>
        </div>
      )}
    </div>
  );
};

/** Download through a fresh signed URL (requested on click). */
export const DownloadButton: FC<{ documentId: string; portal?: boolean; dark?: boolean; label?: string }> = ({ documentId, portal, dark, label = "Download" }) => {
  const workspace = useDownloadDocument();
  const portalDownload = usePortalDownloadDocument();
  const mutation = portal ? portalDownload : workspace;
  return (
    <Button
      size="sm"
      variant={dark ? "secondary" : "outline"}
      loading={mutation.isPending}
      onClick={(e) => {
        e.stopPropagation();
        mutation.mutate(documentId);
      }}
      className={dark ? "bg-[var(--g-surface-dark-elevated)] text-[var(--g-on-dark)] hover:bg-black" : undefined}
    >
      {!mutation.isPending && <Download />}
      {label}
    </Button>
  );
};

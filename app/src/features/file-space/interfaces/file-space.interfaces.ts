import type { DocumentFile, FileFormat } from "@/features/documents/interfaces/documents.interfaces";

export interface Folder {
  type: "client" | "form";
  id: string;
  name: string;
  subtitle: string | null;
  item_count: number;
  size_bytes: number;
  last_modified: string | null;
}

export interface FolderListing {
  level: "root" | "client" | "form";
  breadcrumbs: Array<{ type: "client" | "form"; id: string; name: string }>;
  folders: Folder[];
  files: Array<DocumentFile & { requirement_status: string | null }>;
}

export interface StorageSummary {
  used_bytes: number;
  limit_bytes: number;
  file_count: number;
  by_type: Array<{ file_format: FileFormat; count: number; size_bytes: number }>;
}

export interface FolderQuery {
  client_id?: string;
  assignment_id?: string;
  search?: string;
  file_format?: string;
}

export interface ExportStatus {
  export_id: string;
  status: "QUEUED" | "DELAYED" | "ACTIVE" | "COMPLETED" | "FAILED" | "RETRYING" | "STALLED" | "CANCELLED";
  progress: number;
  attempt: number;
  error: string | null;
  filename: string | null;
  file_count: number | null;
  size_bytes: number | null;
  url: string | null;
  expires_at: string | null;
}

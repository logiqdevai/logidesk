import type { FileFormat } from "@/features/documents/interfaces/documents.interfaces";

export const FileFormatFormOptions: { id: FileFormat; label: string }[] = [
  { id: "PDF", label: "PDF" },
  { id: "IMAGE", label: "Image" },
  { id: "WORD", label: "Word" },
  { id: "EXCEL", label: "Excel" },
];

export function getFileFormatLabel(id?: FileFormat | string | null): string {
  return FileFormatFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

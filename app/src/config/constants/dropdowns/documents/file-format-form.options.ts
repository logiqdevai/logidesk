import type { FileFormat } from "@/features/documents/interfaces/documents.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "documents:fileFormat";

export const FileFormatFormOptions: { id: FileFormat; label: string }[] = lazyOptions(["PDF", "IMAGE", "WORD", "EXCEL"] as const, PREFIX);

export function getFileFormatLabel(id?: FileFormat | string | null): string {
  return optionLabel(PREFIX, id);
}

import type { FileFormat } from "@/features/documents/interfaces/documents.interfaces";
import { FileFormatFormOptions } from "./file-format-form.options";

export const FileFormatFilterOptions: { id: FileFormat | "all"; label: string }[] = [
  { id: "all", label: "All file types" },
  ...FileFormatFormOptions,
];

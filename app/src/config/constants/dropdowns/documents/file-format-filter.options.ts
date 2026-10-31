import type { FileFormat } from "@/features/documents/interfaces/documents.interfaces";
import { lazyOption } from "./lazy-option";
import { FileFormatFormOptions } from "./file-format-form.options";

export const FileFormatFilterOptions: { id: FileFormat | "all"; label: string }[] = [
  lazyOption<FileFormat | "all">("all", "documents:filters.allFileTypes"),
  ...FileFormatFormOptions.map((o) => lazyOption(o.id, `documents:fileFormat.${o.id}`)),
];

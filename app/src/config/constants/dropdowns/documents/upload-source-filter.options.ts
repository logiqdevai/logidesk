import type { UploadSource } from "@/features/documents/interfaces/documents.interfaces";
import { lazyOption } from "./lazy-option";
import { UploadSourceFormOptions } from "./upload-source-form.options";

export const UploadSourceFilterOptions: { id: UploadSource | "all"; label: string }[] = [
  lazyOption<UploadSource | "all">("all", "documents:filters.allSources"),
  ...UploadSourceFormOptions.map((o) => lazyOption(o.id, `documents:uploadSource.${o.id}`)),
];

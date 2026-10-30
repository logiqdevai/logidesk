import type { UploadSource } from "@/features/documents/interfaces/documents.interfaces";
import { UploadSourceFormOptions } from "./upload-source-form.options";

export const UploadSourceFilterOptions: { id: UploadSource | "all"; label: string }[] = [
  { id: "all", label: "All sources" },
  ...UploadSourceFormOptions,
];

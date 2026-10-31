import type { UploadSource } from "@/features/documents/interfaces/documents.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "documents:uploadSource";

export const UploadSourceFormOptions: { id: UploadSource; label: string }[] = lazyOptions(["CLIENT_PORTAL", "EMPLOYEE_UPLOAD", "PUBLIC_PORTAL", "EMAIL"] as const, PREFIX);

export function getUploadSourceLabel(id?: UploadSource | string | null): string {
  return optionLabel(PREFIX, id);
}

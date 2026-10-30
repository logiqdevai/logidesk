import type { UploadSource } from "@/features/documents/interfaces/documents.interfaces";

export const UploadSourceFormOptions: { id: UploadSource; label: string }[] = [
  { id: "CLIENT_PORTAL", label: "Client Portal" },
  { id: "EMPLOYEE_UPLOAD", label: "Employee Upload" },
  { id: "PUBLIC_PORTAL", label: "Public Portal" },
  { id: "EMAIL", label: "Email" },
];

export function getUploadSourceLabel(id?: UploadSource | string | null): string {
  return UploadSourceFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

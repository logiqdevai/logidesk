import type { Confidence } from "@/features/inbox/interfaces/inbox.interfaces";

export const ConfidenceFormOptions: { id: Confidence; label: string }[] = [
  { id: "HIGH", label: "High" },
  { id: "MEDIUM", label: "Medium" },
  { id: "LOW", label: "Low" },
];

export function getConfidenceLabel(id?: Confidence | string | null): string {
  return ConfidenceFormOptions.find((o) => o.id === id)?.label ?? (id ? String(id) : "—");
}

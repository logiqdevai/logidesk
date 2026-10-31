import type { Confidence } from "@/features/inbox/interfaces/inbox.interfaces";
import { lazyOptions, optionLabel } from "./lazy-option";

const PREFIX = "documents:confidence";

export const ConfidenceFormOptions: { id: Confidence; label: string }[] = lazyOptions(["HIGH", "MEDIUM", "LOW"] as const, PREFIX);

export function getConfidenceLabel(id?: Confidence | string | null): string {
  return optionLabel(PREFIX, id);
}

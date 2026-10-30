import type { Confidence } from "@/features/inbox/interfaces/inbox.interfaces";
import { ConfidenceFormOptions } from "./confidence-form.options";

export const ConfidenceFilterOptions: { id: Confidence | "all"; label: string }[] = [
  { id: "all", label: "Any confidence" },
  ...ConfidenceFormOptions,
];

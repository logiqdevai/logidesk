import type { Confidence } from "@/features/inbox/interfaces/inbox.interfaces";
import { lazyOption } from "./lazy-option";
import { ConfidenceFormOptions } from "./confidence-form.options";

export const ConfidenceFilterOptions: { id: Confidence | "all"; label: string }[] = [
  lazyOption<Confidence | "all">("all", "documents:filters.anyConfidence"),
  ...ConfidenceFormOptions.map((o) => lazyOption(o.id, `documents:confidence.${o.id}`)),
];

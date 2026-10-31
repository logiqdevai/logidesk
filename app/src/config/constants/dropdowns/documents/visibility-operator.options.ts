import type { VisibilityOperator } from "@/features/forms/interfaces/forms.interfaces";
import { lazyOptions } from "./lazy-option";

export const VisibilityOperatorOptions: { id: VisibilityOperator; label: string }[] = lazyOptions(["equals", "not_equals", "contains", "answered", "not_answered"] as const, "forms:visibilityOperator");

import type { VisibilityOperator } from "@/features/forms/interfaces/forms.interfaces";

export const VisibilityOperatorOptions: { id: VisibilityOperator; label: string }[] = [
  { id: "equals", label: "is" },
  { id: "not_equals", label: "is not" },
  { id: "contains", label: "contains" },
  { id: "answered", label: "is answered" },
  { id: "not_answered", label: "is not answered" },
];

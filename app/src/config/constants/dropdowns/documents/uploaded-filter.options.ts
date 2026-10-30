export const UploadedFilterOptions: { id: string; label: string }[] = [
  { id: "any", label: "Any upload date" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "never", label: "Not uploaded yet" },
];

export const SubmittedFilterOptions: { id: string; label: string }[] = [
  { id: "any", label: "Any submission time" },
  { id: "7d", label: "Submitted in the last 7 days" },
  { id: "30d", label: "Submitted in the last 30 days" },
  { id: "90d", label: "Submitted in the last 90 days" },
  { id: "not_submitted", label: "Not submitted yet" },
];

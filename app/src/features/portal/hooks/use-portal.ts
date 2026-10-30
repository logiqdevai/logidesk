import { useQuery } from "@tanstack/react-query";
import { QueryKeys, useApiMutation } from "@/hooks/use-api-mutation";
import * as s from "../services/portal.services";

const P = QueryKeys.portal;

export const usePortalMe = () => useQuery({ queryKey: [...P, "me"], queryFn: s.getPortalMe });
export const usePortalOverview = () => useQuery({ queryKey: [...P, "overview"], queryFn: s.getPortalOverview });
export const usePortalForms = () => useQuery({ queryKey: [...P, "forms"], queryFn: s.getPortalForms });
export const usePortalForm = (id?: string) =>
  useQuery({
    queryKey: [...P, "form", id],
    queryFn: () => s.getPortalForm(id!),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.requirements.some((r) => r.status === "SUBMITTED") ? 2000 : false),
  });
export const usePortalDocumentUrl = (id: string | null | undefined, disposition: "inline" | "attachment" = "inline") =>
  useQuery({ queryKey: ["portal-document-url", id, disposition], queryFn: () => s.getPortalDocumentUrl(id!, disposition), enabled: !!id, staleTime: 4 * 60_000 });
export const usePortalDocuments = () => useQuery({ queryKey: [...P, "documents"], queryFn: s.getPortalDocuments });

export const useSavePortalAnswers = () =>
  useApiMutation(s.savePortalAnswers, {
    success: (_, v) => (v.submit ? "Form submitted" : "Draft saved"),
    successDescription: (_, v) => (v.submit ? "Thank you — we will review it shortly." : "You can come back and finish later."),
    error: "Could not save your answers",
    invalidate: [P],
  });
export const usePortalUpload = () => useApiMutation(s.uploadPortalDocument, { success: "Uploaded", successDescription: "Your document was received.", error: "Upload failed", invalidate: [P] });
export const useUpdatePortalAccount = () => useApiMutation(s.updatePortalAccount, { success: "Preferences saved", error: "Could not save your preferences", invalidate: [P] });
export const useUpdatePortalInformation = () => useApiMutation(s.updatePortalInformation, { success: "Information updated", error: "Could not save your information", invalidate: [P] });

export const usePublicPortal = (slug?: string) => useQuery({ queryKey: ["public-portal", slug], queryFn: () => s.getPublicPortal(slug!), enabled: !!slug, retry: false });
export const usePublicForm = (slug?: string, formId?: string) =>
  useQuery({ queryKey: ["public-portal", slug, formId], queryFn: () => s.getPublicForm(slug!, formId!), enabled: !!slug && !!formId, retry: false });
export const useSubmitPublicForm = () => useApiMutation(s.submitPublicForm, { success: "Submitted", successDescription: "Thank you — your documents were received.", error: "Could not submit the form" });

export const usePortalDownloadDocument = () =>
  useApiMutation((id: string) => s.getPortalDocumentUrl(id, "attachment"), { error: "Could not download the file", onSuccess: (d) => window.location.assign(d.url) });

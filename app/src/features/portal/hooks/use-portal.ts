import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

export const useSavePortalAnswers = () => {
  const { t } = useTranslation("portal");
  return useApiMutation(s.savePortalAnswers, {
    success: (_, v) => (v.submit ? t("toasts.formSubmitted") : t("toasts.draftSaved")),
    successDescription: (_, v) => (v.submit ? t("toasts.thankYouReview") : t("toasts.comeBackLater")),
    error: t("toasts.saveAnswersError"),
    invalidate: [P],
  });
};
export const usePortalUpload = () => {
  const { t } = useTranslation("portal");
  return useApiMutation(s.uploadPortalDocument, { success: t("toasts.uploaded"), successDescription: t("toasts.uploadReceived"), error: t("toasts.uploadFailed"), invalidate: [P] });
};
export const useUpdatePortalAccount = () => {
  const { t } = useTranslation("portal");
  return useApiMutation(s.updatePortalAccount, { success: t("toasts.preferencesSaved"), error: t("toasts.preferencesError"), invalidate: [P] });
};
export const useUpdatePortalInformation = () => {
  const { t } = useTranslation("portal");
  return useApiMutation(s.updatePortalInformation, { success: t("toasts.informationUpdated"), error: t("toasts.informationError"), invalidate: [P] });
};

export const usePublicPortal = (slug?: string) => useQuery({ queryKey: ["public-portal", slug], queryFn: () => s.getPublicPortal(slug!), enabled: !!slug, retry: false });
export const usePublicForm = (slug?: string, formId?: string) =>
  useQuery({ queryKey: ["public-portal", slug, formId], queryFn: () => s.getPublicForm(slug!, formId!), enabled: !!slug && !!formId, retry: false });
export const useSubmitPublicForm = () => {
  const { t } = useTranslation("publicPortal");
  return useApiMutation(s.submitPublicForm, { success: t("toasts.submitted"), successDescription: t("toasts.submittedDescription"), error: t("errors.submitFailed") });
};

export const usePortalDownloadDocument = () => {
  const { t } = useTranslation("portal");
  return useApiMutation((id: string) => s.getPortalDocumentUrl(id, "attachment"), { error: t("toasts.downloadError"), onSuccess: (d) => window.location.assign(d.url) });
};

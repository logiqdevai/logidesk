import { ApiRoutes } from "@/config/api/routes";
import i18n from "@/i18n";
import { apiRequest } from "@/lib/request";
import type { AssignmentDetail, SaveAnswersDto } from "@/features/assignments/interfaces/assignments.interfaces";
import type { PortalDocument, PortalFormItem, PortalMe, PortalOverview, PublicForm, PublicPortalOverview } from "../interfaces/portal.interfaces";

const r = ApiRoutes;

export const getPortalMe = () => apiRequest<PortalMe>("get", r.portal.me, i18n.t("errors.loadPortal", { ns: "portal" }));
export const getPortalOverview = () => apiRequest<PortalOverview>("get", r.portal.overview, i18n.t("errors.loadOverview", { ns: "portal" }));
export const getPortalForms = () => apiRequest<PortalFormItem[]>("get", r.portal.forms, i18n.t("errors.loadForms", { ns: "portal" }));
export const getPortalForm = (id: string) => apiRequest<AssignmentDetail>("get", r.portal.form(id), i18n.t("errors.loadForm", { ns: "portal" }));
export const savePortalAnswers = ({ id, ...dto }: SaveAnswersDto & { id: string }) => apiRequest<AssignmentDetail>("patch", r.portal.answers(id), i18n.t("errors.saveAnswers", { ns: "portal" }), dto);
export const uploadPortalDocument = ({ id, requirementId, files }: { id: string; requirementId: string; files: File[] }) => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return apiRequest<AssignmentDetail>("post", r.portal.upload(id, requirementId), i18n.t("errors.uploadFailed", { ns: "portal" }), form);
};
export const getPortalDocuments = () => apiRequest<PortalDocument[]>("get", r.portal.documents, i18n.t("errors.loadDocuments", { ns: "portal" }));
export const getPortalDocumentUrl = (id: string, disposition: "inline" | "attachment") =>
  apiRequest<{ url: string }>("get", r.portal.document_url(id), i18n.t("errors.openFile", { ns: "portal" }), undefined, { disposition });
export const updatePortalAccount = (dto: { notify_reminders?: boolean; notify_review_updates?: boolean }) => apiRequest<PortalMe>("patch", r.portal.account, i18n.t("errors.savePreferences", { ns: "portal" }), dto);
export const updatePortalInformation = (dto: { phone?: string | null; address?: string | null }) => apiRequest<PortalMe>("patch", r.portal.information, i18n.t("errors.saveInformation", { ns: "portal" }), dto);

export const getPublicPortal = (slug: string) => apiRequest<PublicPortalOverview>("get", r.public_portal.root(slug), i18n.t("errors.portalUnavailable", { ns: "publicPortal" }));
export const getPublicForm = (slug: string, formId: string) => apiRequest<PublicForm>("get", r.public_portal.form(slug, formId), i18n.t("errors.formUnavailable", { ns: "publicPortal" }));
export const submitPublicForm = ({ slug, formId, data }: { slug: string; formId: string; data: FormData }) =>
  apiRequest<{ success: boolean; reference: string; files: number }>("post", r.public_portal.submit(slug, formId), i18n.t("errors.submitFailed", { ns: "publicPortal" }), data);

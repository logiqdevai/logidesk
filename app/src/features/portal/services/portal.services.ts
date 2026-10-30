import { ApiRoutes } from "@/config/api/routes";
import { apiRequest } from "@/lib/request";
import type { AssignmentDetail, SaveAnswersDto } from "@/features/assignments/interfaces/assignments.interfaces";
import type { PortalDocument, PortalFormItem, PortalMe, PortalOverview, PublicForm, PublicPortalOverview } from "../interfaces/portal.interfaces";

const r = ApiRoutes;

export const getPortalMe = () => apiRequest<PortalMe>("get", r.portal.me, "Could not load your portal");
export const getPortalOverview = () => apiRequest<PortalOverview>("get", r.portal.overview, "Could not load your overview");
export const getPortalForms = () => apiRequest<PortalFormItem[]>("get", r.portal.forms, "Could not load your forms");
export const getPortalForm = (id: string) => apiRequest<AssignmentDetail>("get", r.portal.form(id), "Could not load the form");
export const savePortalAnswers = ({ id, ...dto }: SaveAnswersDto & { id: string }) => apiRequest<AssignmentDetail>("patch", r.portal.answers(id), "Could not save your answers", dto);
export const uploadPortalDocument = ({ id, requirementId, files }: { id: string; requirementId: string; files: File[] }) => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return apiRequest<AssignmentDetail>("post", r.portal.upload(id, requirementId), "Upload failed", form);
};
export const getPortalDocuments = () => apiRequest<PortalDocument[]>("get", r.portal.documents, "Could not load your documents");
export const getPortalDocumentUrl = (id: string, disposition: "inline" | "attachment") =>
  apiRequest<{ url: string }>("get", r.portal.document_url(id), "Could not open the file", undefined, { disposition });
export const updatePortalAccount = (dto: { notify_reminders?: boolean; notify_review_updates?: boolean }) => apiRequest<PortalMe>("patch", r.portal.account, "Could not save your preferences", dto);
export const updatePortalInformation = (dto: { phone?: string | null; address?: string | null }) => apiRequest<PortalMe>("patch", r.portal.information, "Could not save your information", dto);

export const getPublicPortal = (slug: string) => apiRequest<PublicPortalOverview>("get", r.public_portal.root(slug), "This portal link is not available");
export const getPublicForm = (slug: string, formId: string) => apiRequest<PublicForm>("get", r.public_portal.form(slug, formId), "This form is not available");
export const submitPublicForm = ({ slug, formId, data }: { slug: string; formId: string; data: FormData }) =>
  apiRequest<{ success: boolean; reference: string; files: number }>("post", r.public_portal.submit(slug, formId), "Could not submit the form", data);

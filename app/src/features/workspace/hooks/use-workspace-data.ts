import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DOCUMENT_STATE_KEYS, QueryKeys, useApiMutation } from "@/hooks/use-api-mutation";
import type { ClientQuery } from "@/features/clients/interfaces/clients.interfaces";
import type { DocumentQuery } from "@/features/documents/interfaces/documents.interfaces";
import type { FormQuery, SubmissionsQuery } from "@/features/forms/interfaces/forms.interfaces";
import type { InboxQuery } from "@/features/inbox/interfaces/inbox.interfaces";
import type { FolderQuery } from "@/features/file-space/interfaces/file-space.interfaces";
import type { NotificationQuery } from "@/features/notifications/interfaces/notifications.interfaces";
import * as s from "../services/workspace.services";

const K = QueryKeys;

// ── Queries ──────────────────────────────────────────────────────────────────
export const useDashboard = () => useQuery({ queryKey: K.dashboard, queryFn: s.getDashboard, refetchInterval: 60_000 });
export const useActivity = () => useQuery({ queryKey: K.activity, queryFn: () => s.getActivity() });
export const useOrganization = () => useQuery({ queryKey: K.organization, queryFn: s.getOrganization });

export const useClients = (q: ClientQuery) => useQuery({ queryKey: [...K.clients, "list", q], queryFn: () => s.getClients(q), placeholderData: keepPreviousData });
export const useClient = (id?: string) => useQuery({ queryKey: [...K.clients, "detail", id], queryFn: () => s.getClient(id!), enabled: !!id });
export const useClientNotes = (id?: string) => useQuery({ queryKey: [...K.clients, "notes", id], queryFn: () => s.getClientNotes(id!), enabled: !!id });
export const useClientActivity = (id?: string) => useQuery({ queryKey: [...K.activity, "client", id], queryFn: () => s.getClientActivity(id!), enabled: !!id });
export const useClientAssignments = (id?: string) => useQuery({ queryKey: [...K.assignments, "client", id], queryFn: () => s.getClientAssignments(id!), enabled: !!id });
export const useAssignment = (id?: string) =>
  useQuery({
    queryKey: [...K.assignments, "detail", id],
    queryFn: () => s.getAssignment(id!),
    enabled: !!id,
    // Poll briefly while an upload is still being processed by the worker.
    refetchInterval: (query) => (query.state.data?.requirements.some((r) => r.status === "SUBMITTED") ? 2000 : false),
  });

export const useForms = (q: FormQuery) => useQuery({ queryKey: [...K.forms, "list", q], queryFn: () => s.getForms(q), placeholderData: keepPreviousData });
export const useForm = (id?: string) => useQuery({ queryKey: [...K.forms, "detail", id], queryFn: () => s.getForm(id!), enabled: !!id });
export const useSubmissions = (id: string | undefined, q: SubmissionsQuery) =>
  useQuery({ queryKey: [...K.forms, "submissions", id, q], queryFn: () => s.getSubmissions(id!, q), enabled: !!id, placeholderData: keepPreviousData });

export const useDocuments = (q: DocumentQuery) =>
  useQuery({
    queryKey: [...K.documents, "list", q],
    queryFn: () => s.getDocuments(q),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.data.some((r) => r.status === "SUBMITTED") ? 2000 : false),
  });
export const useDocumentUrl = (id: string | null | undefined, disposition: "inline" | "attachment" = "inline") =>
  useQuery({ queryKey: ["document-url", id, disposition], queryFn: () => s.getDocumentUrl(id!, disposition), enabled: !!id, staleTime: 4 * 60_000 });
export const useDocument = (id?: string | null) => useQuery({ queryKey: [...K.documents, "detail", id], queryFn: () => s.getDocument(id!), enabled: !!id });

export const useInbox = (q: InboxQuery) => useQuery({ queryKey: [...K.inbox, "list", q], queryFn: () => s.getInbox(q), placeholderData: keepPreviousData, refetchInterval: 30_000 });
export const useInboxCounts = (enabled = true) => useQuery({ queryKey: K.inboxCounts, queryFn: s.getInboxCounts, refetchInterval: 30_000, enabled });
export const useInboxItem = (id?: string | null) => useQuery({ queryKey: [...K.inbox, "detail", id], queryFn: () => s.getInboxItem(id!), enabled: !!id });
export const useClientRequirements = (clientId?: string | null) =>
  useQuery({ queryKey: [...K.inbox, "client-requirements", clientId], queryFn: () => s.getClientRequirements(clientId!), enabled: !!clientId });

export const useFolder = (q: FolderQuery) => useQuery({ queryKey: [...K.fileSpace, "browse", q], queryFn: () => s.browseFiles(q), placeholderData: keepPreviousData });
export const useStorageSummary = () => useQuery({ queryKey: [...K.fileSpace, "summary"], queryFn: s.getStorageSummary });
export const useExportStatus = (id?: string | null) =>
  useQuery({
    queryKey: ["export", id],
    queryFn: () => s.getExportStatus(id!),
    enabled: !!id,
    refetchInterval: (query) => (["COMPLETED", "FAILED", "CANCELLED"].includes(query.state.data?.status ?? "") ? false : 1500),
  });

export const useNotifications = (q: NotificationQuery) =>
  useQuery({ queryKey: [...K.notifications, "list", q], queryFn: () => s.getNotifications(q), placeholderData: keepPreviousData, refetchInterval: 15_000 });
export const useNotification = (id?: string | null) =>
  useQuery({
    queryKey: [...K.notifications, "detail", id],
    queryFn: () => s.getNotification(id!),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 2000 : false),
  });
export const useNotificationSettings = () => useQuery({ queryKey: K.notificationSettings, queryFn: s.getNotificationSettings });
export const useTemplates = () => useQuery({ queryKey: K.templates, queryFn: s.getTemplates });
export const useReminderPreview = (dto: { client_id?: string; assignment_id?: string } | null) =>
  useQuery({
    queryKey: ["reminder-preview", dto],
    queryFn: () => s.previewReminder({ client_id: dto!.client_id!, assignment_id: dto?.assignment_id }),
    enabled: !!dto?.client_id,
  });

export const useTeam = () => useQuery({ queryKey: K.team, queryFn: s.getTeam });

// ── Mutations ────────────────────────────────────────────────────────────────
export const useCreateOrganization = () => useApiMutation(s.createOrganization, { success: (d) => `${d.name} created`, error: "Could not create the workspace", invalidate: [["me"]] });
export const useUpdateOrganization = () => useApiMutation(s.updateOrganization, { success: "Settings saved", error: "Could not save settings", invalidate: [K.organization] });
export const useUpdatePortalSettings = () => useApiMutation(s.updatePortalSettings, { success: "Portal settings saved", error: "Could not save portal settings", invalidate: [K.organization] });
export const useUpdateDocumentSettings = () => useApiMutation(s.updateDocumentSettings, { success: "Document settings saved", error: "Could not save document settings", invalidate: [K.organization] });
export const useUploadLogo = () => useApiMutation(s.uploadLogo, { success: "Logo updated", error: "Could not upload the logo", invalidate: [K.organization] });

export const useCreateClient = () => useApiMutation(s.createClient, { success: (c) => `${c.first_name} ${c.last_name} added`, error: "Could not add the client", invalidate: [K.clients, K.dashboard, K.activity] });
export const useUpdateClient = () => useApiMutation(s.updateClient, { success: "Client saved", error: "Could not save the client", invalidate: [K.clients, K.activity] });
export const useArchiveClient = () =>
  useApiMutation(s.archiveClient, { success: (_, v) => (v.archived ? "Client archived" : "Client restored"), error: "Could not update the client", invalidate: [K.clients, K.dashboard] });
export const useSetAssignees = () => useApiMutation(s.setClientAssignees, { success: "Assigned employees updated", error: "Could not update assigned employees", invalidate: [K.clients] });
export const useAddNote = () => useApiMutation(s.addClientNote, { success: "Note saved", error: "Could not save the note", invalidate: [K.clients, K.activity] });
export const useDeleteNote = () => useApiMutation(s.deleteClientNote, { success: "Note deleted", error: "Could not delete the note", invalidate: [K.clients] });
export const useInviteClientPortal = () => useApiMutation(s.inviteClientPortal, { success: "Portal invitation sent", error: "Could not send the invitation", invalidate: [K.clients, K.notifications] });

export const useCreateAssignment = () =>
  useApiMutation(s.createAssignment, { success: (d) => (d.length === 1 ? `"${d[0].form_name}" assigned` : `${d.length} forms assigned`), error: "Could not assign the form", invalidate: [...DOCUMENT_STATE_KEYS, K.notifications] });
export const useUpdateAssignment = () => useApiMutation(s.updateAssignment, { success: "Assignment updated", error: "Could not update the assignment", invalidate: DOCUMENT_STATE_KEYS });
export const useSaveAnswers = () =>
  useApiMutation(s.saveAssignmentAnswers, { success: (_, v) => (v.submit ? "Form submitted" : "Answers saved"), error: "Could not save the answers", invalidate: DOCUMENT_STATE_KEYS });
export const useUpdateRequirement = () => useApiMutation(s.updateRequirement, { success: "Requirement updated", error: "Could not update the requirement", invalidate: DOCUMENT_STATE_KEYS });
export const useCancelAssignment = () => useApiMutation(s.cancelAssignment, { success: "Assignment cancelled", error: "Could not cancel the assignment", invalidate: DOCUMENT_STATE_KEYS });

export const useCreateForm = () => useApiMutation(s.createForm, { success: "Form created", error: "Could not create the form", invalidate: [K.forms] });
export const useUpdateForm = () =>
  useApiMutation(s.updateForm, { success: (_, v) => (v.publish ? "Form published" : "Form saved"), successDescription: "New assignments use the latest version.", error: "Could not save the form", invalidate: [K.forms] });
export const useDuplicateForm = () => useApiMutation(s.duplicateForm, { success: (d) => `"${d.name}" created`, error: "Could not duplicate the form", invalidate: [K.forms] });
export const useArchiveForm = () => useApiMutation(s.archiveForm, { success: (_, v) => (v.archived ? "Form archived" : "Form restored"), error: "Could not update the form", invalidate: [K.forms] });
export const useExportSubmissions = () => useApiMutation(s.exportSubmissions, { success: "Preparing your CSV", error: "Could not start the export" });

export const useUploadDocument = () =>
  useApiMutation(s.uploadDocument, { success: (d) => `${d.documents.length === 1 ? "Document" : `${d.documents.length} files`} uploaded`, error: "Upload failed", invalidate: DOCUMENT_STATE_KEYS });
export const useUpdateDocument = () => useApiMutation(s.updateDocument, { success: "Document updated", error: "Could not update the document", invalidate: DOCUMENT_STATE_KEYS });
export const useReviewDocument = () =>
  useApiMutation(s.reviewDocument, { success: (_, v) => (v.decision === "APPROVED" ? "Document approved" : "Document rejected — client notified"), error: "Could not review the document", invalidate: [...DOCUMENT_STATE_KEYS, K.notifications] });
export const useDeleteDocument = () => useApiMutation(s.deleteDocument, { success: "Document deleted", error: "Could not delete the document", invalidate: DOCUMENT_STATE_KEYS });

export const useResolveInboxItem = () =>
  useApiMutation(s.resolveInboxItem, {
    success: (_, v) => ({ approve: "Document approved", reject: "Document rejected — client notified", confirm: "Match confirmed", change: "Document linked", dismiss: "Item dismissed" })[v.action],
    error: "Could not update the item",
    invalidate: [...DOCUMENT_STATE_KEYS, K.notifications],
  });

export const useRequestZip = () => useApiMutation(s.requestZip, { success: "Preparing your .zip", error: "Could not start the download" });

export const useRetryNotification = () => useApiMutation(s.retryNotification, { success: "Retry queued", error: "Could not retry", invalidate: [K.notifications] });
export const useUpdateNotificationSettings = () =>
  useApiMutation(s.updateNotificationSettings, { success: "Notification settings saved", error: "Could not save notification settings", invalidate: [K.notificationSettings, K.organization] });
export const useCreateTemplate = () => useApiMutation(s.createTemplate, { success: "Template created", error: "Could not create the template", invalidate: [K.templates] });
export const useUpdateTemplate = () => useApiMutation(s.updateTemplate, { success: "Template saved", error: "Could not save the template", invalidate: [K.templates] });
export const useDeleteTemplate = () => useApiMutation(s.deleteTemplate, { success: "Template deleted", error: "Could not delete the template", invalidate: [K.templates] });
export const useSendReminder = () =>
  useApiMutation(s.sendReminder, { success: "Reminder queued", successDescription: "It will be delivered in a moment.", error: "Could not send the reminder", invalidate: [K.notifications, K.activity, K.dashboard] });
export const useSendBulkReminders = () =>
  useApiMutation(s.sendBulkReminders, { success: (d) => `${d.sent} reminder${d.sent === 1 ? "" : "s"} queued`, error: "Could not send reminders", invalidate: [K.notifications, K.activity] });

export const useInviteMember = () => useApiMutation(s.inviteMember, { success: (_, v) => `Invitation sent to ${v.email}`, error: "Could not send the invitation", invalidate: [K.team] });
export const useResendInvitation = () => useApiMutation(s.resendInvitation, { success: "Invitation re-sent", error: "Could not resend the invitation", invalidate: [K.team] });
export const useRevokeInvitation = () => useApiMutation(s.revokeInvitation, { success: "Invitation revoked", error: "Could not revoke the invitation", invalidate: [K.team] });
export const useChangeRole = () => useApiMutation(s.changeMemberRole, { success: "Role updated", error: "Could not change the role", invalidate: [K.team, ["me"]] });
export const useRemoveMember = () => useApiMutation(s.removeMember, { success: "Member removed", error: "Could not remove the member", invalidate: [K.team] });

/** Fetches a fresh short-lived signed URL and starts the download. */
export const useDownloadDocument = () =>
  useApiMutation((id: string) => s.getDocumentUrl(id, "attachment"), { error: "Could not download the file", onSuccess: (d) => window.location.assign(d.url) });

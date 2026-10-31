import { keepPreviousData, useQuery } from "@tanstack/react-query";
import i18n from "@/i18n";
import { DEFAULT_TIME_ZONE } from "@/lib/format";
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
/** The organization's IANA time zone (deadlines are entered and shown in it); Athens until loaded. */
export const useOrgTimeZone = () => useOrganization().data?.time_zone || DEFAULT_TIME_ZONE;

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
export const useCreateOrganization = () => useApiMutation(s.createOrganization, { success: (d) => i18n.t("workspaces:api.workspaceCreated", { name: d.name }), error: i18n.t("workspaces:api.couldNotCreateTheWorkspace"), invalidate: [["me"]] });
export const useUpdateOrganization = () => useApiMutation(s.updateOrganization, { success: i18n.t("workspaces:api.settingsSaved"), error: i18n.t("workspaces:api.couldNotSaveSettings"), invalidate: [K.organization] });
export const useUpdatePortalSettings = () => useApiMutation(s.updatePortalSettings, { success: i18n.t("workspaces:api.portalSettingsSaved"), error: i18n.t("workspaces:api.couldNotSavePortalSettings"), invalidate: [K.organization] });
export const useUpdateDocumentSettings = () => useApiMutation(s.updateDocumentSettings, { success: i18n.t("workspaces:api.documentSettingsSaved"), error: i18n.t("workspaces:api.couldNotSaveDocumentSettings"), invalidate: [K.organization] });
export const useUploadLogo = () => useApiMutation(s.uploadLogo, { success: i18n.t("workspaces:api.logoUpdated"), error: i18n.t("workspaces:api.couldNotUploadTheLogo"), invalidate: [K.organization] });

export const useCreateClient = () => useApiMutation(s.createClient, { success: (c) => i18n.t("workspaces:api.clientAdded", { name: `${c.first_name} ${c.last_name}` }), error: i18n.t("workspaces:api.couldNotAddTheClient"), invalidate: [K.clients, K.dashboard, K.activity] });
export const useUpdateClient = () => useApiMutation(s.updateClient, { success: i18n.t("workspaces:api.clientSaved"), error: i18n.t("workspaces:api.couldNotSaveTheClient"), invalidate: [K.clients, K.activity] });
export const useArchiveClient = () =>
  useApiMutation(s.archiveClient, { success: (_, v) => (v.archived ? i18n.t("workspaces:api.clientArchived") : i18n.t("workspaces:api.clientRestored")), error: i18n.t("workspaces:api.couldNotUpdateTheClient"), invalidate: [K.clients, K.dashboard] });
export const useSetAssignees = () => useApiMutation(s.setClientAssignees, { success: i18n.t("workspaces:api.assignedEmployeesUpdated"), error: i18n.t("workspaces:api.couldNotUpdateAssignedEmployees"), invalidate: [K.clients] });
export const useAddNote = () => useApiMutation(s.addClientNote, { success: i18n.t("workspaces:api.noteSaved"), error: i18n.t("workspaces:api.couldNotSaveTheNote"), invalidate: [K.clients, K.activity] });
export const useDeleteNote = () => useApiMutation(s.deleteClientNote, { success: i18n.t("workspaces:api.noteDeleted"), error: i18n.t("workspaces:api.couldNotDeleteTheNote"), invalidate: [K.clients] });
export const useInviteClientPortal = () => useApiMutation(s.inviteClientPortal, { success: i18n.t("workspaces:api.portalInvitationSent"), error: i18n.t("workspaces:api.couldNotSendTheInvitation"), invalidate: [K.clients, K.notifications] });

export const useCreateAssignment = () =>
  useApiMutation(s.createAssignment, { success: (d) => i18n.t("workspaces:api.formsAssigned", { count: d.length, name: d[0]?.form_name }), error: i18n.t("workspaces:api.couldNotAssignTheForm"), invalidate: [...DOCUMENT_STATE_KEYS, K.notifications] });
export const useUpdateAssignment = () => useApiMutation(s.updateAssignment, { success: i18n.t("workspaces:api.assignmentUpdated"), error: i18n.t("workspaces:api.couldNotUpdateTheAssignment"), invalidate: DOCUMENT_STATE_KEYS });
export const useSaveAnswers = () =>
  useApiMutation(s.saveAssignmentAnswers, { success: (_, v) => (v.submit ? i18n.t("workspaces:api.formSubmitted") : i18n.t("workspaces:api.answersSaved")), error: i18n.t("workspaces:api.couldNotSaveTheAnswers"), invalidate: DOCUMENT_STATE_KEYS });
export const useUpdateRequirement = () => useApiMutation(s.updateRequirement, { success: i18n.t("workspaces:api.requirementUpdated"), error: i18n.t("workspaces:api.couldNotUpdateTheRequirement"), invalidate: DOCUMENT_STATE_KEYS });
export const useCancelAssignment = () => useApiMutation(s.cancelAssignment, { success: i18n.t("workspaces:api.assignmentCancelled"), error: i18n.t("workspaces:api.couldNotCancelTheAssignment"), invalidate: DOCUMENT_STATE_KEYS });

export const useCreateForm = () => useApiMutation(s.createForm, { success: i18n.t("workspaces:api.formCreated"), error: i18n.t("workspaces:api.couldNotCreateTheForm"), invalidate: [K.forms] });
export const useUpdateForm = () =>
  useApiMutation(s.updateForm, { success: (_, v) => (v.publish ? i18n.t("workspaces:api.formPublished") : i18n.t("workspaces:api.formSaved")), successDescription: i18n.t("workspaces:api.newAssignmentsUseTheLatestVersion"), error: i18n.t("workspaces:api.couldNotSaveTheForm"), invalidate: [K.forms] });
export const useDuplicateForm = () => useApiMutation(s.duplicateForm, { success: (d) => i18n.t("workspaces:api.formDuplicated", { name: d.name }), error: i18n.t("workspaces:api.couldNotDuplicateTheForm"), invalidate: [K.forms] });
export const useArchiveForm = () => useApiMutation(s.archiveForm, { success: (_, v) => (v.archived ? i18n.t("workspaces:api.formArchived") : i18n.t("workspaces:api.formRestored")), error: i18n.t("workspaces:api.couldNotUpdateTheForm"), invalidate: [K.forms] });
export const useExportSubmissions = () => useApiMutation(s.exportSubmissions, { success: i18n.t("workspaces:api.preparingYourCSV"), error: i18n.t("workspaces:api.couldNotStartTheExport") });

export const useUploadDocument = () =>
  useApiMutation(s.uploadDocument, { success: (d) => i18n.t("workspaces:api.documentsUploaded", { count: d.documents.length }), error: i18n.t("workspaces:api.uploadFailed"), invalidate: DOCUMENT_STATE_KEYS });
export const useUpdateDocument = () => useApiMutation(s.updateDocument, { success: i18n.t("workspaces:api.documentUpdated"), error: i18n.t("workspaces:api.couldNotUpdateTheDocument"), invalidate: DOCUMENT_STATE_KEYS });
export const useReviewDocument = () =>
  useApiMutation(s.reviewDocument, { success: (_, v) => (v.decision === "APPROVED" ? i18n.t("workspaces:api.documentApproved") : i18n.t("workspaces:api.documentRejectedClientNotified")), error: i18n.t("workspaces:api.couldNotReviewTheDocument"), invalidate: [...DOCUMENT_STATE_KEYS, K.notifications] });
export const useDeleteDocument = () => useApiMutation(s.deleteDocument, { success: i18n.t("workspaces:api.documentDeleted"), error: i18n.t("workspaces:api.couldNotDeleteTheDocument"), invalidate: DOCUMENT_STATE_KEYS });

export const useResolveInboxItem = () =>
  useApiMutation(s.resolveInboxItem, {
    success: (_, v) => ({ approve: i18n.t("workspaces:api.documentApproved"), reject: i18n.t("workspaces:api.documentRejectedClientNotified"), confirm: i18n.t("workspaces:api.matchConfirmed"), change: i18n.t("workspaces:api.documentLinked"), dismiss: i18n.t("workspaces:api.itemDismissed") })[v.action],
    error: i18n.t("workspaces:api.couldNotUpdateTheItem"),
    invalidate: [...DOCUMENT_STATE_KEYS, K.notifications],
  });

export const useRequestZip = () => useApiMutation(s.requestZip, { success: i18n.t("workspaces:api.preparingYourZip"), error: i18n.t("workspaces:api.couldNotStartTheDownload") });

export const useRetryNotification = () => useApiMutation(s.retryNotification, { success: i18n.t("workspaces:api.retryQueued"), error: i18n.t("workspaces:api.couldNotRetry"), invalidate: [K.notifications] });
export const useUpdateNotificationSettings = () =>
  useApiMutation(s.updateNotificationSettings, { success: i18n.t("workspaces:api.notificationSettingsSaved"), error: i18n.t("workspaces:api.couldNotSaveNotificationSettings"), invalidate: [K.notificationSettings, K.organization] });
export const useCreateTemplate = () => useApiMutation(s.createTemplate, { success: i18n.t("workspaces:api.templateCreated"), error: i18n.t("workspaces:api.couldNotCreateTheTemplate"), invalidate: [K.templates] });
export const useUpdateTemplate = () => useApiMutation(s.updateTemplate, { success: i18n.t("workspaces:api.templateSaved"), error: i18n.t("workspaces:api.couldNotSaveTheTemplate"), invalidate: [K.templates] });
export const useDeleteTemplate = () => useApiMutation(s.deleteTemplate, { success: i18n.t("workspaces:api.templateDeleted"), error: i18n.t("workspaces:api.couldNotDeleteTheTemplate"), invalidate: [K.templates] });
export const useSendReminder = () =>
  useApiMutation(s.sendReminder, { success: i18n.t("workspaces:api.reminderQueued"), successDescription: i18n.t("workspaces:api.itWillBeDeliveredInAMoment"), error: i18n.t("workspaces:api.couldNotSendTheReminder"), invalidate: [K.notifications, K.activity, K.dashboard] });
export const useSendBulkReminders = () =>
  useApiMutation(s.sendBulkReminders, { success: (d) => i18n.t("workspaces:api.remindersQueued", { count: d.sent }), error: i18n.t("workspaces:api.couldNotSendReminders"), invalidate: [K.notifications, K.activity] });

export const useInviteMember = () => useApiMutation(s.inviteMember, { success: (_, v) => i18n.t("workspaces:api.invitationSentTo", { email: v.email }), error: i18n.t("workspaces:api.couldNotSendTheInvitation"), invalidate: [K.team] });
export const useResendInvitation = () => useApiMutation(s.resendInvitation, { success: i18n.t("workspaces:api.invitationReSent"), error: i18n.t("workspaces:api.couldNotResendTheInvitation"), invalidate: [K.team] });
export const useRevokeInvitation = () => useApiMutation(s.revokeInvitation, { success: i18n.t("workspaces:api.invitationRevoked"), error: i18n.t("workspaces:api.couldNotRevokeTheInvitation"), invalidate: [K.team] });
export const useChangeRole = () => useApiMutation(s.changeMemberRole, { success: i18n.t("workspaces:api.roleUpdated"), error: i18n.t("workspaces:api.couldNotChangeTheRole"), invalidate: [K.team, ["me"]] });
export const useRemoveMember = () => useApiMutation(s.removeMember, { success: i18n.t("workspaces:api.memberRemoved"), error: i18n.t("workspaces:api.couldNotRemoveTheMember"), invalidate: [K.team] });

/** Fetches a fresh short-lived signed URL and starts the download. */
export const useDownloadDocument = () =>
  useApiMutation((id: string) => s.getDocumentUrl(id, "attachment"), { error: i18n.t("workspaces:api.couldNotDownloadTheFile"), onSuccess: (d) => window.location.assign(d.url) });

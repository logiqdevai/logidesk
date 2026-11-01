import { ApiRoutes } from "@/config/api/routes";
import i18n from "@/i18n";
import { apiRequest, type Paginated } from "@/lib/request";
import type { DashboardOverview, ActivityItem } from "@/features/dashboard/interfaces/dashboard.interfaces";
import type { ClientDetail, ClientImportPreview, ClientImportResult, ClientInvitationsResult, ClientListItem, ClientNote, ClientQuery, ImportClientsDto, SaveClientDto } from "@/features/clients/interfaces/clients.interfaces";
import type {
  AssignmentDetail,
  AssignmentListItem,
  CreateAssignmentDto,
  SaveAnswersDto,
  UpdateRequirementDto,
} from "@/features/assignments/interfaces/assignments.interfaces";
import type { FormDetail, FormListItem, FormQuery, SaveFormDto, SubmissionsQuery, SubmissionsResponse } from "@/features/forms/interfaces/forms.interfaces";
import type { DocumentDetail, DocumentQuery, DocumentRow, ReviewDocumentDto, UploadDocumentDto } from "@/features/documents/interfaces/documents.interfaces";
import type { InboxCounts, InboxItem, InboxItemDetail, InboxQuery, ResolveInboxDto, CandidateRequirement } from "@/features/inbox/interfaces/inbox.interfaces";
import type { ExportStatus, FolderListing, FolderQuery, StorageSummary } from "@/features/file-space/interfaces/file-space.interfaces";
import type {
  NotificationDetail,
  NotificationItem,
  NotificationQuery,
  NotificationSettings,
  NotificationTemplate,
  ReminderPreview,
  SaveTemplateDto,
  SendReminderDto,
  UpdateNotificationSettingsDto,
} from "@/features/notifications/interfaces/notifications.interfaces";
import type { InviteMemberDto, TeamResponse } from "@/features/team/interfaces/team.interfaces";
import type { OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";
import type {
  CreateOrganizationDto,
  Organization,
  UpdateDocumentSettingsDto,
  UpdateOrganizationDto,
  UpdatePortalSettingsDto,
} from "@/features/organizations/interfaces/organizations.interfaces";

const r = ApiRoutes;

// Dashboard & activity
export const getDashboard = () => apiRequest<DashboardOverview>("get", r.dashboard, i18n.t("workspaces:api.couldNotLoadTheDashboard"));
export const getActivity = (params?: { client_id?: string }) => apiRequest<ActivityItem[]>("get", r.activity, i18n.t("workspaces:api.couldNotLoadActivity"), undefined, params);

// Organizations
export const createOrganization = (dto: CreateOrganizationDto) => apiRequest<{ id: string; name: string }>("post", r.organizations.create, i18n.t("workspaces:api.couldNotCreateTheWorkspace"), dto);
export const getOrganization = () => apiRequest<Organization>("get", r.organizations.current, i18n.t("workspaces:api.couldNotLoadWorkspaceSettings"));
export const updateOrganization = (dto: UpdateOrganizationDto) => apiRequest<Organization>("patch", r.organizations.current, i18n.t("workspaces:api.couldNotSaveSettings"), dto);
export const updatePortalSettings = (dto: UpdatePortalSettingsDto) => apiRequest<Organization>("patch", r.organizations.portal, i18n.t("workspaces:api.couldNotSavePortalSettings"), dto);
export const updateDocumentSettings = (dto: UpdateDocumentSettingsDto) => apiRequest<Organization>("patch", r.organizations.documents, i18n.t("workspaces:api.couldNotSaveDocumentSettings"), dto);
export const uploadLogo = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<Organization>("post", r.organizations.logo, i18n.t("workspaces:api.couldNotUploadTheLogo"), form);
};

export const removeLogo = () => apiRequest<Organization>("delete", r.organizations.logo, i18n.t("workspaces:api.couldNotRemoveTheLogo"));

// Clients
export const getClients = (q: ClientQuery) => apiRequest<Paginated<ClientListItem>>("get", r.clients.root, i18n.t("workspaces:api.couldNotLoadClients"), undefined, { ...q });
export const getClient = (id: string) => apiRequest<ClientDetail>("get", r.clients.detail(id), i18n.t("workspaces:api.couldNotLoadTheClient"));
export const previewClientImport = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<ClientImportPreview>("post", r.clients.import_preview, i18n.t("workspaces:api.couldNotReadTheFile"), form);
};
export const inviteImportedClients = (client_ids: string[]) =>
  apiRequest<ClientInvitationsResult>("post", r.clients.import_invitations, i18n.t("workspaces:api.couldNotSendTheInvitation"), { client_ids });
export const importClients = (dto: ImportClientsDto) => {
  const form = new FormData();
  form.append("file", dto.file);
  form.append("mapping", JSON.stringify(dto.mapping));
  form.append("skip_duplicates", String(dto.skip_duplicates));
  if (dto.ignore_warnings) form.append("ignore_warnings", "true");
  return apiRequest<ClientImportResult>("post", r.clients.import, i18n.t("workspaces:api.couldNotImportClients"), form);
};
export const createClient = (dto: SaveClientDto) => apiRequest<ClientDetail>("post", r.clients.root, i18n.t("workspaces:api.couldNotAddTheClient"), dto);
export const updateClient = ({ id, ...dto }: Partial<SaveClientDto> & { id: string }) => apiRequest<ClientDetail>("patch", r.clients.detail(id), i18n.t("workspaces:api.couldNotSaveTheClient"), dto);
export const archiveClient = ({ id, archived }: { id: string; archived: boolean }) =>
  apiRequest<ClientDetail>("post", archived ? r.clients.archive(id) : r.clients.restore(id), i18n.t("workspaces:api.couldNotUpdateTheClient"));
export const deleteClient = (id: string) => apiRequest<{ success: boolean }>("delete", r.clients.detail(id), i18n.t("workspaces:api.couldNotDeleteTheClient"));
export const setClientAssignees = ({ id, member_ids }: { id: string; member_ids: string[] }) =>
  apiRequest<ClientDetail>("patch", r.clients.assignees(id), i18n.t("workspaces:api.couldNotUpdateAssignedEmployees"), { member_ids });
export const getClientNotes = (id: string) => apiRequest<ClientNote[]>("get", r.clients.notes(id), i18n.t("workspaces:api.couldNotLoadNotes"));
export const addClientNote = ({ id, body }: { id: string; body: string }) => apiRequest<ClientNote[]>("post", r.clients.notes(id), i18n.t("workspaces:api.couldNotSaveTheNote"), { body });
export const deleteClientNote = ({ id, noteId }: { id: string; noteId: string }) => apiRequest<ClientNote[]>("delete", r.clients.note(id, noteId), i18n.t("workspaces:api.couldNotDeleteTheNote"));
export const getClientActivity = (id: string) => apiRequest<ActivityItem[]>("get", r.clients.activity(id), i18n.t("workspaces:api.couldNotLoadActivity"));
export const inviteClientPortal = (id: string) => apiRequest<{ success: boolean }>("post", r.clients.invite(id), i18n.t("workspaces:api.couldNotSendTheInvitation"));

// Assignments
export const createAssignment = (dto: CreateAssignmentDto) =>
  apiRequest<Array<{ id: string; form_id: string; form_name: string }>>("post", r.assignments.root, i18n.t("workspaces:api.couldNotAssignTheForm"), dto);
export const getClientAssignments = (clientId: string) => apiRequest<AssignmentListItem[]>("get", r.assignments.for_client(clientId), i18n.t("workspaces:api.couldNotLoadAssignedForms"));
export const getAssignment = (id: string) => apiRequest<AssignmentDetail>("get", r.assignments.detail(id), i18n.t("workspaces:api.couldNotLoadTheForm"));
export const updateAssignment = ({ id, ...dto }: { id: string; deadline?: string | null; message?: string; reminder?: unknown }) =>
  apiRequest<AssignmentDetail>("patch", r.assignments.detail(id), i18n.t("workspaces:api.couldNotUpdateTheAssignment"), dto);
export const saveAssignmentAnswers = ({ id, ...dto }: SaveAnswersDto & { id: string }) => apiRequest<AssignmentDetail>("patch", r.assignments.answers(id), i18n.t("workspaces:api.couldNotSaveTheAnswers"), dto);
export const updateRequirement = ({ id, requirementId, ...dto }: UpdateRequirementDto & { id: string; requirementId: string }) =>
  apiRequest<AssignmentDetail>("patch", r.assignments.requirement(id, requirementId), i18n.t("workspaces:api.couldNotUpdateTheRequirement"), dto);
export const cancelAssignment = (id: string) => apiRequest<{ success: boolean }>("post", r.assignments.cancel(id), i18n.t("workspaces:api.couldNotCancelTheAssignment"));

// Forms
export const getForms = (q: FormQuery) => apiRequest<Paginated<FormListItem>>("get", r.forms.root, i18n.t("workspaces:api.couldNotLoadForms"), undefined, { ...q });
export const getForm = (id: string) => apiRequest<FormDetail>("get", r.forms.detail(id), i18n.t("workspaces:api.couldNotLoadTheForm"));
export const createForm = (dto: SaveFormDto & { name: string }) => apiRequest<FormDetail>("post", r.forms.root, i18n.t("workspaces:api.couldNotCreateTheForm"), dto);
export const updateForm = ({ id, ...dto }: SaveFormDto & { id: string }) => apiRequest<FormDetail>("patch", r.forms.detail(id), i18n.t("workspaces:api.couldNotSaveTheForm"), dto);
export const duplicateForm = ({ id, ...dto }: { id: string; name?: string; is_template?: boolean }) => apiRequest<FormDetail>("post", r.forms.duplicate(id), i18n.t("workspaces:api.couldNotDuplicateTheForm"), dto);
export const archiveForm = ({ id, archived }: { id: string; archived: boolean }) =>
  apiRequest<FormDetail>("post", archived ? r.forms.archive(id) : r.forms.restore(id), i18n.t("workspaces:api.couldNotUpdateTheForm"));
export const getSubmissions = (id: string, q: SubmissionsQuery) => apiRequest<SubmissionsResponse>("get", r.forms.submissions(id), i18n.t("workspaces:api.couldNotLoadSubmissions"), undefined, { ...q });
export const exportSubmissions = ({ id, ...q }: SubmissionsQuery & { id: string }) =>
  apiRequest<{ export_id: string }>("post", r.forms.submissions_export(id), i18n.t("workspaces:api.couldNotStartTheExport"), undefined, { ...q });

// Documents
export const getDocuments = (q: DocumentQuery) => apiRequest<Paginated<DocumentRow> & { document_types: string[] }>("get", r.documents.root, i18n.t("workspaces:api.couldNotLoadDocuments"), undefined, { ...q });
export const getDocument = (id: string) => apiRequest<DocumentDetail>("get", r.documents.detail(id), i18n.t("workspaces:api.couldNotLoadTheDocument"));
export const getDocumentUrl = (id: string, disposition: "inline" | "attachment") =>
  apiRequest<{ url: string; expires_in: number }>("get", r.documents.url(id), i18n.t("workspaces:api.couldNotOpenTheFile"), undefined, { disposition });
export const uploadDocument = (dto: UploadDocumentDto) => {
  const form = new FormData();
  form.append("assignment_requirement_id", dto.assignment_requirement_id);
  if (dto.expiration_date) form.append("expiration_date", dto.expiration_date);
  if (dto.notes) form.append("notes", dto.notes);
  dto.files.forEach((f) => form.append("files", f));
  return apiRequest<{ documents: Array<{ id: string }> }>("post", r.documents.upload, i18n.t("workspaces:api.couldNotUploadTheDocument"), form);
};
export const updateDocument = ({ id, ...dto }: { id: string; title?: string; expiration_date?: string | null; notes?: string }) =>
  apiRequest<DocumentDetail>("patch", r.documents.detail(id), i18n.t("workspaces:api.couldNotUpdateTheDocument"), dto);
export const reviewDocument = ({ id, ...dto }: ReviewDocumentDto & { id: string }) => apiRequest<DocumentDetail>("post", r.documents.review(id), i18n.t("workspaces:api.couldNotReviewTheDocument"), dto);
export const deleteDocument = (id: string) => apiRequest<{ success: boolean }>("delete", r.documents.detail(id), i18n.t("workspaces:api.couldNotDeleteTheDocument"));

// Inbox
export const getInbox = (q: InboxQuery) => apiRequest<Paginated<InboxItem> & { counts: InboxCounts }>("get", r.inbox.root, i18n.t("workspaces:api.couldNotLoadTheInbox"), undefined, { ...q });
export const getInboxCounts = () => apiRequest<InboxCounts>("get", r.inbox.counts, i18n.t("workspaces:api.couldNotLoadInboxCounts"));
export const getInboxItem = (id: string) => apiRequest<InboxItemDetail>("get", r.inbox.detail(id), i18n.t("workspaces:api.couldNotLoadTheItem"));
export const resolveInboxItem = ({ id, ...dto }: ResolveInboxDto & { id: string }) => apiRequest<InboxItemDetail>("post", r.inbox.resolve(id), i18n.t("workspaces:api.couldNotUpdateTheItem"), dto);
export const getClientRequirements = (clientId: string) => apiRequest<CandidateRequirement[]>("get", r.inbox.client_requirements(clientId), i18n.t("workspaces:api.couldNotLoadRequirements"));

// File Space & exports
export const browseFiles = (q: FolderQuery) => apiRequest<FolderListing>("get", r.file_space.root, i18n.t("workspaces:api.couldNotLoadFiles"), undefined, { ...q });
export const getStorageSummary = () => apiRequest<StorageSummary>("get", r.file_space.summary, i18n.t("workspaces:api.couldNotLoadStorageUsage"));
export const requestZip = (dto: { client_id?: string; assignment_id?: string }) => apiRequest<{ export_id: string }>("post", r.file_space.zip, i18n.t("workspaces:api.couldNotStartTheDownload"), dto);
export const getExportStatus = (id: string) => apiRequest<ExportStatus>("get", r.exports.status(id), i18n.t("workspaces:api.couldNotCheckTheExport"));

// Notifications & reminders
export const getNotifications = (q: NotificationQuery) =>
  apiRequest<Paginated<NotificationItem> & { counts: Record<string, number> }>("get", r.notifications.root, i18n.t("workspaces:api.couldNotLoadNotifications"), undefined, { ...q });
export const getNotification = (id: string) => apiRequest<NotificationDetail>("get", r.notifications.detail(id), i18n.t("workspaces:api.couldNotLoadTheNotification"));
export const retryNotification = (id: string) => apiRequest<NotificationDetail>("post", r.notifications.retry(id), i18n.t("workspaces:api.couldNotRetry"));
export const getNotificationSettings = () => apiRequest<NotificationSettings>("get", r.notifications.settings, i18n.t("workspaces:api.couldNotLoadNotificationSettings"));
export const updateNotificationSettings = (dto: UpdateNotificationSettingsDto) =>
  apiRequest<NotificationSettings>("patch", r.notifications.settings, i18n.t("workspaces:api.couldNotSaveNotificationSettings"), dto);
export const getTemplates = () => apiRequest<{ data: NotificationTemplate[]; variables: string[] }>("get", r.notifications.templates, i18n.t("workspaces:api.couldNotLoadTemplates"));
export const createTemplate = (dto: SaveTemplateDto) => apiRequest<NotificationTemplate>("post", r.notifications.templates, i18n.t("workspaces:api.couldNotCreateTheTemplate"), dto);
export const updateTemplate = ({ id, ...dto }: Partial<SaveTemplateDto> & { id: string }) => apiRequest<NotificationTemplate>("patch", r.notifications.template(id), i18n.t("workspaces:api.couldNotSaveTheTemplate"), dto);
export const deleteTemplate = (id: string) => apiRequest<{ success: boolean }>("delete", r.notifications.template(id), i18n.t("workspaces:api.couldNotDeleteTheTemplate"));
export const previewReminder = (dto: { client_id: string; assignment_id?: string }) => apiRequest<ReminderPreview>("post", r.reminders.preview, i18n.t("workspaces:api.couldNotPrepareTheReminder"), dto);
export const sendReminder = (dto: SendReminderDto) => apiRequest<{ notification_id: string | null; status: string }>("post", r.reminders.send, i18n.t("workspaces:api.couldNotSendTheReminder"), dto);
export const sendBulkReminders = (client_ids: string[]) => apiRequest<{ sent: number }>("post", r.reminders.bulk, i18n.t("workspaces:api.couldNotSendReminders"), { client_ids });

// Team
export const getTeam = () => apiRequest<TeamResponse>("get", r.team.root, i18n.t("workspaces:api.couldNotLoadTheTeam"));
export const inviteMember = (dto: InviteMemberDto) => apiRequest<TeamResponse>("post", r.team.invitations, i18n.t("workspaces:api.couldNotSendTheInvitation"), dto);
export const resendInvitation = (id: string) => apiRequest<TeamResponse>("post", r.team.resend(id), i18n.t("workspaces:api.couldNotResendTheInvitation"));
export const revokeInvitation = (id: string) => apiRequest<TeamResponse>("delete", r.team.invitation(id), i18n.t("workspaces:api.couldNotRevokeTheInvitation"));
export const changeMemberRole = ({ memberId, role }: { memberId: string; role: OrganizationRole }) => apiRequest<TeamResponse>("patch", r.team.role(memberId), i18n.t("workspaces:api.couldNotChangeTheRole"), { role });
export const removeMember = (memberId: string) => apiRequest<TeamResponse>("delete", r.team.member(memberId), i18n.t("workspaces:api.couldNotRemoveTheMember"));

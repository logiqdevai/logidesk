import { ApiRoutes } from "@/config/api/routes";
import { apiRequest, type Paginated } from "@/lib/request";
import type { DashboardOverview, ActivityItem } from "@/features/dashboard/interfaces/dashboard.interfaces";
import type { ClientDetail, ClientListItem, ClientNote, ClientQuery, SaveClientDto } from "@/features/clients/interfaces/clients.interfaces";
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
export const getDashboard = () => apiRequest<DashboardOverview>("get", r.dashboard, "Could not load the dashboard");
export const getActivity = (params?: { client_id?: string }) => apiRequest<ActivityItem[]>("get", r.activity, "Could not load activity", undefined, params);

// Organizations
export const createOrganization = (dto: CreateOrganizationDto) => apiRequest<{ id: string; name: string }>("post", r.organizations.create, "Could not create the workspace", dto);
export const getOrganization = () => apiRequest<Organization>("get", r.organizations.current, "Could not load workspace settings");
export const updateOrganization = (dto: UpdateOrganizationDto) => apiRequest<Organization>("patch", r.organizations.current, "Could not save settings", dto);
export const updatePortalSettings = (dto: UpdatePortalSettingsDto) => apiRequest<Organization>("patch", r.organizations.portal, "Could not save portal settings", dto);
export const updateDocumentSettings = (dto: UpdateDocumentSettingsDto) => apiRequest<Organization>("patch", r.organizations.documents, "Could not save document settings", dto);
export const uploadLogo = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<Organization>("post", r.organizations.logo, "Could not upload the logo", form);
};

// Clients
export const getClients = (q: ClientQuery) => apiRequest<Paginated<ClientListItem>>("get", r.clients.root, "Could not load clients", undefined, { ...q });
export const getClient = (id: string) => apiRequest<ClientDetail>("get", r.clients.detail(id), "Could not load the client");
export const createClient = (dto: SaveClientDto) => apiRequest<ClientDetail>("post", r.clients.root, "Could not add the client", dto);
export const updateClient = ({ id, ...dto }: Partial<SaveClientDto> & { id: string }) => apiRequest<ClientDetail>("patch", r.clients.detail(id), "Could not save the client", dto);
export const archiveClient = ({ id, archived }: { id: string; archived: boolean }) =>
  apiRequest<ClientDetail>("post", archived ? r.clients.archive(id) : r.clients.restore(id), "Could not update the client");
export const setClientAssignees = ({ id, member_ids }: { id: string; member_ids: string[] }) =>
  apiRequest<ClientDetail>("patch", r.clients.assignees(id), "Could not update assigned employees", { member_ids });
export const getClientNotes = (id: string) => apiRequest<ClientNote[]>("get", r.clients.notes(id), "Could not load notes");
export const addClientNote = ({ id, body }: { id: string; body: string }) => apiRequest<ClientNote[]>("post", r.clients.notes(id), "Could not save the note", { body });
export const deleteClientNote = ({ id, noteId }: { id: string; noteId: string }) => apiRequest<ClientNote[]>("delete", r.clients.note(id, noteId), "Could not delete the note");
export const getClientActivity = (id: string) => apiRequest<ActivityItem[]>("get", r.clients.activity(id), "Could not load activity");
export const inviteClientPortal = (id: string) => apiRequest<{ success: boolean }>("post", r.clients.invite(id), "Could not send the invitation");

// Assignments
export const createAssignment = (dto: CreateAssignmentDto) =>
  apiRequest<Array<{ id: string; form_id: string; form_name: string }>>("post", r.assignments.root, "Could not assign the form", dto);
export const getClientAssignments = (clientId: string) => apiRequest<AssignmentListItem[]>("get", r.assignments.for_client(clientId), "Could not load assigned forms");
export const getAssignment = (id: string) => apiRequest<AssignmentDetail>("get", r.assignments.detail(id), "Could not load the form");
export const updateAssignment = ({ id, ...dto }: { id: string; deadline?: string | null; message?: string; reminder?: unknown }) =>
  apiRequest<AssignmentDetail>("patch", r.assignments.detail(id), "Could not update the assignment", dto);
export const saveAssignmentAnswers = ({ id, ...dto }: SaveAnswersDto & { id: string }) => apiRequest<AssignmentDetail>("patch", r.assignments.answers(id), "Could not save the answers", dto);
export const updateRequirement = ({ id, requirementId, ...dto }: UpdateRequirementDto & { id: string; requirementId: string }) =>
  apiRequest<AssignmentDetail>("patch", r.assignments.requirement(id, requirementId), "Could not update the requirement", dto);
export const cancelAssignment = (id: string) => apiRequest<{ success: boolean }>("post", r.assignments.cancel(id), "Could not cancel the assignment");

// Forms
export const getForms = (q: FormQuery) => apiRequest<Paginated<FormListItem>>("get", r.forms.root, "Could not load forms", undefined, { ...q });
export const getForm = (id: string) => apiRequest<FormDetail>("get", r.forms.detail(id), "Could not load the form");
export const createForm = (dto: SaveFormDto & { name: string }) => apiRequest<FormDetail>("post", r.forms.root, "Could not create the form", dto);
export const updateForm = ({ id, ...dto }: SaveFormDto & { id: string }) => apiRequest<FormDetail>("patch", r.forms.detail(id), "Could not save the form", dto);
export const duplicateForm = ({ id, ...dto }: { id: string; name?: string; is_template?: boolean }) => apiRequest<FormDetail>("post", r.forms.duplicate(id), "Could not duplicate the form", dto);
export const archiveForm = ({ id, archived }: { id: string; archived: boolean }) =>
  apiRequest<FormDetail>("post", archived ? r.forms.archive(id) : r.forms.restore(id), "Could not update the form");
export const getSubmissions = (id: string, q: SubmissionsQuery) => apiRequest<SubmissionsResponse>("get", r.forms.submissions(id), "Could not load submissions", undefined, { ...q });
export const exportSubmissions = ({ id, ...q }: SubmissionsQuery & { id: string }) =>
  apiRequest<{ export_id: string }>("post", r.forms.submissions_export(id), "Could not start the export", undefined, { ...q });

// Documents
export const getDocuments = (q: DocumentQuery) => apiRequest<Paginated<DocumentRow> & { document_types: string[] }>("get", r.documents.root, "Could not load documents", undefined, { ...q });
export const getDocument = (id: string) => apiRequest<DocumentDetail>("get", r.documents.detail(id), "Could not load the document");
export const getDocumentUrl = (id: string, disposition: "inline" | "attachment") =>
  apiRequest<{ url: string; expires_in: number }>("get", r.documents.url(id), "Could not open the file", undefined, { disposition });
export const uploadDocument = (dto: UploadDocumentDto) => {
  const form = new FormData();
  form.append("assignment_requirement_id", dto.assignment_requirement_id);
  if (dto.expiration_date) form.append("expiration_date", dto.expiration_date);
  if (dto.notes) form.append("notes", dto.notes);
  dto.files.forEach((f) => form.append("files", f));
  return apiRequest<{ documents: Array<{ id: string }> }>("post", r.documents.upload, "Could not upload the document", form);
};
export const updateDocument = ({ id, ...dto }: { id: string; title?: string; expiration_date?: string | null; notes?: string }) =>
  apiRequest<DocumentDetail>("patch", r.documents.detail(id), "Could not update the document", dto);
export const reviewDocument = ({ id, ...dto }: ReviewDocumentDto & { id: string }) => apiRequest<DocumentDetail>("post", r.documents.review(id), "Could not review the document", dto);
export const deleteDocument = (id: string) => apiRequest<{ success: boolean }>("delete", r.documents.detail(id), "Could not delete the document");

// Inbox
export const getInbox = (q: InboxQuery) => apiRequest<Paginated<InboxItem> & { counts: InboxCounts }>("get", r.inbox.root, "Could not load the inbox", undefined, { ...q });
export const getInboxCounts = () => apiRequest<InboxCounts>("get", r.inbox.counts, "Could not load inbox counts");
export const getInboxItem = (id: string) => apiRequest<InboxItemDetail>("get", r.inbox.detail(id), "Could not load the item");
export const resolveInboxItem = ({ id, ...dto }: ResolveInboxDto & { id: string }) => apiRequest<InboxItemDetail>("post", r.inbox.resolve(id), "Could not update the item", dto);
export const getClientRequirements = (clientId: string) => apiRequest<CandidateRequirement[]>("get", r.inbox.client_requirements(clientId), "Could not load requirements");

// File Space & exports
export const browseFiles = (q: FolderQuery) => apiRequest<FolderListing>("get", r.file_space.root, "Could not load files", undefined, { ...q });
export const getStorageSummary = () => apiRequest<StorageSummary>("get", r.file_space.summary, "Could not load storage usage");
export const requestZip = (dto: { client_id?: string; assignment_id?: string }) => apiRequest<{ export_id: string }>("post", r.file_space.zip, "Could not start the download", dto);
export const getExportStatus = (id: string) => apiRequest<ExportStatus>("get", r.exports.status(id), "Could not check the export");

// Notifications & reminders
export const getNotifications = (q: NotificationQuery) =>
  apiRequest<Paginated<NotificationItem> & { counts: Record<string, number> }>("get", r.notifications.root, "Could not load notifications", undefined, { ...q });
export const getNotification = (id: string) => apiRequest<NotificationDetail>("get", r.notifications.detail(id), "Could not load the notification");
export const retryNotification = (id: string) => apiRequest<NotificationDetail>("post", r.notifications.retry(id), "Could not retry");
export const getNotificationSettings = () => apiRequest<NotificationSettings>("get", r.notifications.settings, "Could not load notification settings");
export const updateNotificationSettings = (dto: UpdateNotificationSettingsDto) =>
  apiRequest<NotificationSettings>("patch", r.notifications.settings, "Could not save notification settings", dto);
export const getTemplates = () => apiRequest<{ data: NotificationTemplate[]; variables: string[] }>("get", r.notifications.templates, "Could not load templates");
export const createTemplate = (dto: SaveTemplateDto) => apiRequest<NotificationTemplate>("post", r.notifications.templates, "Could not create the template", dto);
export const updateTemplate = ({ id, ...dto }: Partial<SaveTemplateDto> & { id: string }) => apiRequest<NotificationTemplate>("patch", r.notifications.template(id), "Could not save the template", dto);
export const deleteTemplate = (id: string) => apiRequest<{ success: boolean }>("delete", r.notifications.template(id), "Could not delete the template");
export const previewReminder = (dto: { client_id: string; assignment_id?: string }) => apiRequest<ReminderPreview>("post", r.reminders.preview, "Could not prepare the reminder", dto);
export const sendReminder = (dto: SendReminderDto) => apiRequest<{ notification_id: string | null; status: string }>("post", r.reminders.send, "Could not send the reminder", dto);
export const sendBulkReminders = (client_ids: string[]) => apiRequest<{ sent: number }>("post", r.reminders.bulk, "Could not send reminders", { client_ids });

// Team
export const getTeam = () => apiRequest<TeamResponse>("get", r.team.root, "Could not load the team");
export const inviteMember = (dto: InviteMemberDto) => apiRequest<TeamResponse>("post", r.team.invitations, "Could not send the invitation", dto);
export const resendInvitation = (id: string) => apiRequest<TeamResponse>("post", r.team.resend(id), "Could not resend the invitation");
export const revokeInvitation = (id: string) => apiRequest<TeamResponse>("delete", r.team.invitation(id), "Could not revoke the invitation");
export const changeMemberRole = ({ memberId, role }: { memberId: string; role: OrganizationRole }) => apiRequest<TeamResponse>("patch", r.team.role(memberId), "Could not change the role", { role });
export const removeMember = (memberId: string) => apiRequest<TeamResponse>("delete", r.team.member(memberId), "Could not remove the member");

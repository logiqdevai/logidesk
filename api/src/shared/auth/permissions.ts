import { OrganizationRole } from 'generated/prisma';

/**
 * Centralized permission catalogue. Roles map to permission sets here and nowhere else, so
 * custom roles / granular permissions can later be stored per organization without touching
 * controllers (they only declare the permission they need).
 */
export const Permission = {
  /** See every client of the organization (otherwise only assigned clients). */
  CLIENTS_VIEW_ALL: 'clients.view_all',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_MANAGE: 'clients.manage',
  CLIENTS_ARCHIVE: 'clients.archive',
  /** Delete a client (Owner and Admin only; Members never get it). */
  CLIENTS_DELETE: 'clients.delete',
  CLIENTS_ASSIGN_EMPLOYEES: 'clients.assign_employees',
  FORMS_VIEW: 'forms.view',
  FORMS_MANAGE: 'forms.manage',
  /** Archive / restore forms (the app's "delete"). */
  FORMS_ARCHIVE: 'forms.archive',
  ASSIGNMENTS_MANAGE: 'assignments.manage',
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_REVIEW: 'documents.review',
  DOCUMENTS_DELETE: 'documents.delete',
  INBOX_VIEW_UNIDENTIFIED: 'inbox.view_unidentified',
  REMINDERS_SEND: 'reminders.send',
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  TEAM_VIEW: 'team.view',
  TEAM_MANAGE: 'team.manage',
  TEAM_GRANT_OWNER: 'team.grant_owner',
  SETTINGS_MANAGE: 'settings.manage',
  INTEGRATIONS_MANAGE: 'integrations.manage',
  BILLING_MANAGE: 'billing.manage',
  AUDIT_VIEW: 'audit.view',
  JOBS_VIEW: 'jobs.view',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ALL = Object.values(Permission);

export const RolePermissions: Record<OrganizationRole, readonly Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== Permission.TEAM_GRANT_OWNER && p !== Permission.BILLING_MANAGE),
  MEMBER: [
    Permission.CLIENTS_CREATE,
    Permission.CLIENTS_MANAGE,
    Permission.FORMS_VIEW,
    Permission.FORMS_MANAGE,
    Permission.ASSIGNMENTS_MANAGE,
    Permission.DOCUMENTS_UPLOAD,
    Permission.DOCUMENTS_REVIEW,
    Permission.REMINDERS_SEND,
    Permission.NOTIFICATIONS_VIEW,
    Permission.TEAM_VIEW,
  ],
};

export function hasPermission(role: OrganizationRole, permission: Permission): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}

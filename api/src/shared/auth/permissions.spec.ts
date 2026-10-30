import { OrganizationRole } from 'generated/prisma';
import { hasPermission, Permission } from './permissions';

describe('role permissions', () => {
  it('only Owners can grant the Owner role', () => {
    expect(hasPermission(OrganizationRole.OWNER, Permission.TEAM_GRANT_OWNER)).toBe(true);
    expect(hasPermission(OrganizationRole.ADMIN, Permission.TEAM_GRANT_OWNER)).toBe(false);
    expect(hasPermission(OrganizationRole.MEMBER, Permission.TEAM_GRANT_OWNER)).toBe(false);
  });

  it('Admins manage clients, forms, team and settings', () => {
    for (const p of [Permission.CLIENTS_VIEW_ALL, Permission.FORMS_MANAGE, Permission.TEAM_MANAGE, Permission.SETTINGS_MANAGE]) {
      expect(hasPermission(OrganizationRole.ADMIN, p)).toBe(true);
    }
  });

  it('Members work only with assigned clients and cannot change settings or the team', () => {
    expect(hasPermission(OrganizationRole.MEMBER, Permission.CLIENTS_VIEW_ALL)).toBe(false);
    expect(hasPermission(OrganizationRole.MEMBER, Permission.SETTINGS_MANAGE)).toBe(false);
    expect(hasPermission(OrganizationRole.MEMBER, Permission.TEAM_MANAGE)).toBe(false);
    for (const p of [Permission.DOCUMENTS_UPLOAD, Permission.DOCUMENTS_REVIEW, Permission.REMINDERS_SEND, Permission.ASSIGNMENTS_MANAGE]) {
      expect(hasPermission(OrganizationRole.MEMBER, p)).toBe(true);
    }
  });
});

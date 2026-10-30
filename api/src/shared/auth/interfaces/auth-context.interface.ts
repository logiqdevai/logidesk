import { OrganizationRole } from 'generated/prisma';

export const TokenContexts = {
  ACCOUNT: 'account',
  WORKSPACE: 'workspace',
  PORTAL: 'portal',
} as const;

export type TokenContext = (typeof TokenContexts)[keyof typeof TokenContexts];

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  ctx: TokenContext;
  org?: string;
  cu?: string;
  typ: 'access';
}

/** Any signed-in user (workspace chooser, profile, invitations, workspace creation). */
export interface AccountContext {
  user_id: string;
  session_id: string;
  context: TokenContext;
}

/** Employee acting inside one organization. */
export interface WorkspaceContext extends AccountContext {
  organization_id: string;
  member_id: string;
  role: OrganizationRole;
  permissions: readonly string[];
}

/** Client portal principal (one client of one organization). */
export interface PortalContext extends AccountContext {
  organization_id: string;
  client_id: string;
  client_user_id: string;
}

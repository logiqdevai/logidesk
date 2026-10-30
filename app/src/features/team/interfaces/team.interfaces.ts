import type { OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";

export interface TeamMember {
  member_id: string;
  user_id: string;
  name: string;
  email: string;
  role: OrganizationRole;
  status: "ACTIVE" | "SUSPENDED";
  joined_at: string;
  last_active_at: string | null;
  client_count: number;
  is_you: boolean;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: OrganizationRole;
  message: string | null;
  expires_at: string;
  expired: boolean;
  last_sent_at: string;
  invited_by: string | null;
}

export interface TeamResponse {
  members: TeamMember[];
  invitations: TeamInvitation[];
  owner_count: number;
}

export interface InviteMemberDto {
  email: string;
  role: OrganizationRole;
  message?: string;
}

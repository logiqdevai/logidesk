import type { OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";

export const OrganizationRoleDescriptionOptions: Record<OrganizationRole, string> = {
  OWNER: "Full access including team, billing-ready settings and integrations.",
  ADMIN: "Manages clients, forms, documents, employees and settings.",
  MEMBER: "Works with assigned clients: uploads, reviews and sends reminders.",
};

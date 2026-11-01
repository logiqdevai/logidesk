import { ApiRoutes } from "@/config/api/routes";
import i18n from "@/i18n";
import { apiRequest } from "@/lib/request";
import type { AdminInviteUserDto, AdminUserFilters, AdminUsersResponse } from "../interfaces/admin.interfaces";

export const getAdminUsers = (filters: AdminUserFilters = {}) => apiRequest<AdminUsersResponse>("get", ApiRoutes.admin.users, i18n.t("admin:api.couldNotLoadUsers"), undefined, { ...filters });
export const inviteAdminUser = (dto: AdminInviteUserDto) => apiRequest<AdminUsersResponse>("post", ApiRoutes.admin.invitations, i18n.t("admin:api.couldNotSendInvitation"), dto);

import { ApiRoutes } from "@/config/api/routes";
import i18n from "@/i18n";
import { apiRequest } from "@/lib/request";
import type { AdminDeleteUserResult, AdminDeletionPreview, AdminInviteUserDto, AdminUserFilters, AdminUsersResponse } from "../interfaces/admin.interfaces";

export const getAdminUsers = (filters: AdminUserFilters = {}) => apiRequest<AdminUsersResponse>("get", ApiRoutes.admin.users, i18n.t("admin:api.couldNotLoadUsers"), undefined, { ...filters });
export const inviteAdminUser = (dto: AdminInviteUserDto) => apiRequest<AdminUsersResponse>("post", ApiRoutes.admin.invitations, i18n.t("admin:api.couldNotSendInvitation"), dto);
export const getAdminDeletionPreview = (id: string) => apiRequest<AdminDeletionPreview>("get", ApiRoutes.admin.deletionPreview(id), i18n.t("admin:api.couldNotLoadPreview"));
export const deleteAdminUser = (id: string) => apiRequest<AdminDeleteUserResult>("delete", ApiRoutes.admin.user(id), i18n.t("admin:api.couldNotDeleteUser"));

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import i18n from "@/i18n";
import { QueryKeys, useApiMutation } from "@/hooks/use-api-mutation";
import * as s from "../services/admin.services";
import type { AdminUserFilters } from "../interfaces/admin.interfaces";

const ADMIN_USERS = ["admin-users"] as const;

export const useAdminUsers = (filters: AdminUserFilters = {}) =>
  useQuery({ queryKey: [...ADMIN_USERS, filters], queryFn: () => s.getAdminUsers(filters), placeholderData: keepPreviousData });

export const useAdminDeletionPreview = (id: string | null) =>
  useQuery({ queryKey: [...ADMIN_USERS, "deletion-preview", id], queryFn: () => s.getAdminDeletionPreview(id!), enabled: !!id, staleTime: 0, gcTime: 0 });

export const useDeleteAdminUser = () =>
  useApiMutation(s.deleteAdminUser, {
    success: () => i18n.t("admin:api.userDeleted"),
    error: i18n.t("admin:api.couldNotDeleteUser"),
    // Their workspaces (and everything in them) are gone too.
    invalidate: [ADMIN_USERS, QueryKeys.team, QueryKeys.organization, QueryKeys.clients, QueryKeys.documents, QueryKeys.dashboard],
  });

export const useInviteAdminUser = () =>
  useApiMutation(s.inviteAdminUser, {
    success: (_, v) => i18n.t("admin:api.invitationSentTo", { email: v.email }),
    error: i18n.t("admin:api.couldNotSendInvitation"),
    // The target workspace's own team list changes too.
    invalidate: [ADMIN_USERS, QueryKeys.team],
  });

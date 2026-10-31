import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import i18n from "@/i18n";
import { toast } from "@/hooks/use-toast";
import { Routes } from "@/routes/routes";
import * as service from "../services/auth.services";
import { Permissions, type Permission, type SignInDto, type SignUpDto } from "../interfaces/auth.interfaces";

export const authKeys = { me: ["me"] as const };

const errorToast = (title: string) => (error: Error) => toast({ variant: "destructive", title, description: error.message });

export function useMe(enabled = true) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return useQuery({ queryKey: authKeys.me, queryFn: service.getMe, enabled: enabled && isLoggedIn, staleTime: 30_000 });
}

export function useSignIn() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SignInDto) => service.signIn(dto),
    onSuccess: (data) => {
      queryClient.clear();
      setSession(data);
      toast({ title: i18n.t("auth:toasts.signedIn"), description: data.user.first_name ? i18n.t("auth:toasts.welcomeBackName", { name: data.user.first_name }) : i18n.t("auth:toasts.welcomeBack") });
    },
    onError: errorToast("auth:errors.signIn"),
  });
}

export function useSignUp() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SignUpDto) => service.signUp(dto),
    onSuccess: (data) => {
      queryClient.clear();
      setSession(data);
      toast({ title: i18n.t("auth:toasts.accountCreated"), description: i18n.t("auth:toasts.accountCreatedDesc") });
    },
    onError: errorToast("auth:errors.signUp"),
  });
}

export function useSignOut() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => service.signOut().catch(() => undefined),
    onSettled: () => {
      clear();
      queryClient.clear();
      navigate(Routes.auth.sign_in, { replace: true });
      toast({ title: i18n.t("auth:toasts.signedOut") });
    },
  });
}

/** Opens a workspace or client portal and navigates to its home. */
export function useSwitchContext() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (dto: { organization_id?: string; client_user_id?: string }) => service.switchContext(dto),
    onSuccess: (data) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      setSession(data);
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      navigate(data.context?.type === "portal" ? Routes.portal.root : Routes.dashboard, { replace: true });
    },
    onError: errorToast("auth:errors.open"),
  });
}

export function useLeaveContext() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => service.leaveContext(),
    onSuccess: (data) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      setSession(data);
      navigate(Routes.workspaces);
    },
    onError: errorToast("auth:errors.switchWorkspace"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: service.updateProfile,
    onSuccess: (user) => {
      setUser(user);
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      toast({ title: i18n.t("auth:toasts.profileUpdated") });
    },
    onError: errorToast("auth:errors.updateProfile"),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: service.changePassword,
    onSuccess: () => toast({ title: i18n.t("auth:toasts.passwordChanged"), description: i18n.t("auth:toasts.passwordChangedDesc") }),
    onError: errorToast("auth:errors.changePassword"),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: service.forgotPassword,
    onSuccess: () => toast({ title: i18n.t("auth:toasts.checkInbox"), description: i18n.t("auth:toasts.checkInboxDesc") }),
    onError: errorToast("auth:errors.sendReset"),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: service.resetPassword,
    onSuccess: () => toast({ title: i18n.t("auth:toasts.passwordUpdated"), description: i18n.t("auth:toasts.passwordUpdatedDesc") }),
    onError: errorToast("auth:errors.resetPassword"),
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: service.verifyEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      toast({ title: i18n.t("auth:toasts.emailVerified") });
    },
    onError: errorToast("auth:errors.verifyEmail"),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: service.resendVerification,
    onSuccess: () => toast({ title: i18n.t("auth:toasts.verificationSent") }),
    onError: errorToast("auth:errors.resendEmail"),
  });
}

export function useInvitation(token: string | null) {
  return useQuery({ queryKey: ["invitation", token], queryFn: () => service.lookupInvitation(token!), enabled: !!token, retry: false });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: service.acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      toast({ title: i18n.t("auth:toasts.invitationAccepted") });
    },
    onError: errorToast("auth:errors.acceptInvitation"),
  });
}

/** Active workspace (from /auth/me) + permission helper for hiding UI the API would reject. */
export function useWorkspace() {
  const context = useAuthStore((s) => s.context);
  const me = useMe();
  const workspace = me.data?.workspaces.find((w) => w.organization_id === context.organization_id) ?? null;
  const can = (permission: Permission) => !!workspace?.permissions.includes(permission);
  return { workspace, me: me.data, can, isOwnerOrAdmin: can(Permissions.CLIENTS_VIEW_ALL), isLoading: me.isLoading };
}

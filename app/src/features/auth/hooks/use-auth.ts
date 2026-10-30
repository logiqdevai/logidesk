import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
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
      toast({ title: "Signed in", description: `Welcome back${data.user.first_name ? `, ${data.user.first_name}` : ""}.` });
    },
    onError: errorToast("Could not sign in"),
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
      toast({ title: "Account created", description: "We sent you an email to verify your address." });
    },
    onError: errorToast("Could not create your account"),
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
      toast({ title: "Signed out" });
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
    onError: errorToast("Could not open"),
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
    onError: errorToast("Could not switch workspace"),
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
      toast({ title: "Profile updated" });
    },
    onError: errorToast("Could not update your profile"),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: service.changePassword,
    onSuccess: () => toast({ title: "Password changed", description: "Other sessions were signed out." }),
    onError: errorToast("Could not change your password"),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: service.forgotPassword,
    onSuccess: () => toast({ title: "Check your inbox", description: "If an account exists, a reset link is on its way." }),
    onError: errorToast("Could not send the reset email"),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: service.resetPassword,
    onSuccess: () => toast({ title: "Password updated", description: "Sign in with your new password." }),
    onError: errorToast("Could not reset your password"),
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: service.verifyEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      toast({ title: "Email verified" });
    },
    onError: errorToast("Could not verify your email"),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: service.resendVerification,
    onSuccess: () => toast({ title: "Verification email sent" }),
    onError: errorToast("Could not resend the email"),
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
      toast({ title: "Invitation accepted" });
    },
    onError: errorToast("Could not accept the invitation"),
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

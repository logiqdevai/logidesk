import { ApiRoutes } from "@/config/api/routes";
import i18n from "@/i18n";
import { apiRequest } from "@/lib/request";
import type { AuthUser, InvitationInfo, MeResponse, SessionTokens, SignInDto, SignUpDto } from "../interfaces/auth.interfaces";

type SessionResponse = SessionTokens & { user: AuthUser };

export const signIn = (dto: SignInDto) => apiRequest<SessionResponse>("post", ApiRoutes.auth.login, i18n.t("auth:errors.signIn"), dto);
export const signUp = (dto: SignUpDto) => apiRequest<SessionResponse>("post", ApiRoutes.auth.register, i18n.t("auth:errors.signUp"), dto);
export const signOut = () => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.logout, i18n.t("auth:errors.signOut"));
export const getMe = () => apiRequest<MeResponse>("get", ApiRoutes.auth.me, i18n.t("auth:errors.loadAccount"));
export const updateProfile = (dto: Partial<Pick<AuthUser, "first_name" | "last_name" | "phone" | "language">>) =>
  apiRequest<AuthUser>("patch", ApiRoutes.auth.me, i18n.t("auth:errors.updateProfile"), dto);
export const changePassword = (dto: { current_password: string; new_password: string }) =>
  apiRequest<{ success: boolean }>("post", ApiRoutes.auth.change_password, i18n.t("auth:errors.changePassword"), dto);
export const switchContext = (dto: { organization_id?: string; client_user_id?: string }) =>
  apiRequest<SessionTokens>("post", ApiRoutes.auth.switch, i18n.t("auth:errors.openWorkspace"), dto);
export const leaveContext = () => apiRequest<SessionTokens>("post", ApiRoutes.auth.leave, i18n.t("auth:errors.switchWorkspace"));
export const forgotPassword = (email: string) => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.forgot_password, i18n.t("auth:errors.sendReset"), { email });
export const resetPassword = (dto: { token: string; password: string }) => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.reset_password, i18n.t("auth:errors.resetPassword"), dto);
export const verifyEmail = (token: string) => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.verify_email, i18n.t("auth:errors.verifyEmail"), { token });
export const resendVerification = () => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.resend_verification, i18n.t("auth:errors.resendVerification"));
export const lookupInvitation = (token: string) => apiRequest<InvitationInfo>("get", ApiRoutes.auth.invitation_lookup, i18n.t("auth:errors.invalidInvitation"), undefined, { token });
export const acceptInvitation = (token: string) =>
  apiRequest<{ context: { type: "account" | "workspace" | "portal"; organization_id?: string; client_user_id?: string } }>("post", ApiRoutes.auth.invitation_accept, i18n.t("auth:errors.acceptInvitation"), { token });

import { ApiRoutes } from "@/config/api/routes";
import { apiRequest } from "@/lib/request";
import type { AuthUser, InvitationInfo, MeResponse, SessionTokens, SignInDto, SignUpDto } from "../interfaces/auth.interfaces";

type SessionResponse = SessionTokens & { user: AuthUser };

export const signIn = (dto: SignInDto) => apiRequest<SessionResponse>("post", ApiRoutes.auth.login, "Could not sign in", dto);
export const signUp = (dto: SignUpDto) => apiRequest<SessionResponse>("post", ApiRoutes.auth.register, "Could not create your account", dto);
export const signOut = () => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.logout, "Could not sign out");
export const getMe = () => apiRequest<MeResponse>("get", ApiRoutes.auth.me, "Could not load your account");
export const updateProfile = (dto: Partial<Pick<AuthUser, "first_name" | "last_name" | "phone">>) =>
  apiRequest<AuthUser>("patch", ApiRoutes.auth.me, "Could not update your profile", dto);
export const changePassword = (dto: { current_password: string; new_password: string }) =>
  apiRequest<{ success: boolean }>("post", ApiRoutes.auth.change_password, "Could not change your password", dto);
export const switchContext = (dto: { organization_id?: string; client_user_id?: string }) =>
  apiRequest<SessionTokens>("post", ApiRoutes.auth.switch, "Could not open this workspace", dto);
export const leaveContext = () => apiRequest<SessionTokens>("post", ApiRoutes.auth.leave, "Could not switch workspace");
export const forgotPassword = (email: string) => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.forgot_password, "Could not send the reset email", { email });
export const resetPassword = (dto: { token: string; password: string }) => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.reset_password, "Could not reset your password", dto);
export const verifyEmail = (token: string) => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.verify_email, "Could not verify your email", { token });
export const resendVerification = () => apiRequest<{ success: boolean }>("post", ApiRoutes.auth.resend_verification, "Could not resend the verification email");
export const lookupInvitation = (token: string) => apiRequest<InvitationInfo>("get", ApiRoutes.auth.invitation_lookup, "This invitation link is not valid", undefined, { token });
export const acceptInvitation = (token: string) =>
  apiRequest<{ context: { type: "workspace" | "portal"; organization_id?: string; client_user_id?: string } }>("post", ApiRoutes.auth.invitation_accept, "Could not accept the invitation", { token });

import { z } from "zod";
import i18n from "@/i18n";

/** Lazy message: resolved when validation runs, so it follows the active language. */
const msg = (key: string) => ({ error: () => i18n.t(key) });

export const signInSchema = z.object({
  email: z.string().trim().email(msg("auth:validation.email")),
  password: z.string().min(1, msg("auth:validation.passwordRequired")),
});
export type SignInFormData = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  first_name: z.string().trim().min(1, msg("auth:validation.firstName")).max(80),
  last_name: z.string().trim().min(1, msg("auth:validation.lastName")).max(80),
  email: z.string().trim().email(msg("auth:validation.email")),
  country: z.string().min(1, msg("auth:validation.country")),
  password: z.string().min(8, msg("auth:validation.passwordMin")).max(128),
  terms: z.boolean().refine((v) => v, msg("auth:validation.terms")),
});
export type SignUpFormData = z.infer<typeof signUpSchema>;

export const emailSchema = z.object({ email: z.string().trim().email(msg("auth:validation.email")) });
export type EmailFormData = z.infer<typeof emailSchema>;

export const resetSchema = z
  .object({
    password: z.string().min(8, msg("auth:validation.passwordMin")).max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { ...msg("auth:validation.passwordMismatch"), path: ["confirm"] });
export type ResetFormData = z.infer<typeof resetSchema>;

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, msg("auth:validation.minChars")).max(120),
  time_zone: z.string().min(1),
});
export type WorkspaceFormData = z.infer<typeof workspaceSchema>;

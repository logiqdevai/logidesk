import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type SignInFormData = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name").max(80),
  last_name: z.string().trim().min(1, "Enter your last name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "At least 8 characters").max(128),
  terms: z.boolean().refine((v) => v, "Please accept the terms to continue"),
});
export type SignUpFormData = z.infer<typeof signUpSchema>;

export const emailSchema = z.object({ email: z.string().trim().email("Enter a valid email address") });
export type EmailFormData = z.infer<typeof emailSchema>;

export const resetSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });
export type ResetFormData = z.infer<typeof resetSchema>;

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(120),
  time_zone: z.string().min(1),
});
export type WorkspaceFormData = z.infer<typeof workspaceSchema>;

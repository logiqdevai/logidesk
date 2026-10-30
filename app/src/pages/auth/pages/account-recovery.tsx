import { useEffect, useRef, type FC } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import AuthLayout from "../components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";
import { useForgotPassword, useResetPassword, useVerifyEmail } from "@/features/auth/hooks/use-auth";
import { emailSchema, resetSchema, type EmailFormData, type ResetFormData } from "../validation-schemas/auth.schema";

export const ForgotPasswordPage: FC = () => {
  const forgot = useForgotPassword();
  const form = useForm<EmailFormData>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });
  return (
    <AuthLayout>
      <h1>Reset password</h1>
      {forgot.isSuccess ? (
        <div className="callout ok mt-4">
          <MailCheck className="h-5 w-5 shrink-0" />
          <div>If an account exists for that address, we sent a link to choose a new password. The link expires in 1 hour.</div>
        </div>
      ) : (
        <>
          <p className="muted">Enter the email you use to sign in and we will send you a reset link.</p>
          <Form {...form}>
            <form className="mt-5 flex flex-col gap-4" onSubmit={form.handleSubmit((v) => forgot.mutate(v.email))} noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@company.com" autoComplete="email" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="h-10" loading={forgot.isPending}>
                Send reset link
              </Button>
            </form>
          </Form>
        </>
      )}
      <Link to={Routes.auth.sign_in} className="caption mt-5">
        Back to sign in
      </Link>
    </AuthLayout>
  );
};

export const ResetPasswordPage: FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const reset = useResetPassword();
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);
  const form = useForm<ResetFormData>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  return (
    <AuthLayout>
      <h1>Choose a new password</h1>
      {!token ? (
        <p className="muted">This reset link is incomplete. Request a new one.</p>
      ) : (
        <Form {...form}>
          <form
            className="mt-5 flex flex-col gap-4"
            onSubmit={form.handleSubmit((v) =>
              reset.mutate(
                { token, password: v.password },
                {
                  onSuccess: () => {
                    clear();
                    navigate(Routes.auth.sign_in, { replace: true });
                  },
                },
              ),
            )}
            noValidate
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="At least 8 characters" autoComplete="new-password" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="Repeat the new password" autoComplete="new-password" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-10" loading={reset.isPending}>
              Update password
            </Button>
          </form>
        </Form>
      )}
      <Link to={Routes.auth.forgot_password} className="caption mt-5">
        Request a new link
      </Link>
    </AuthLayout>
  );
};

export const VerifyEmailPage: FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const verify = useVerifyEmail();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const started = useRef(false);
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      verify.mutate(token);
    }
  }, [token, verify]);
  return (
    <AuthLayout>
      <h1>Email verification</h1>
      {verify.isPending || (!verify.isSuccess && !verify.isError && token) ? (
        <p className="muted mt-2">Verifying your email address…</p>
      ) : verify.isSuccess ? (
        <div className="callout ok mt-4">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>Your email address is verified.</div>
        </div>
      ) : (
        <div className="callout bad mt-4">
          <XCircle className="h-5 w-5 shrink-0" />
          <div>{verify.error?.message ?? "This verification link is invalid or has expired."}</div>
        </div>
      )}
      <Button asChild className="mt-5 h-10 self-start">
        <Link to={isLoggedIn ? Routes.workspaces : Routes.auth.sign_in}>{isLoggedIn ? "Continue" : "Sign in"}</Link>
      </Button>
    </AuthLayout>
  );
};

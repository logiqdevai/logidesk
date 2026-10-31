import { useEffect, useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("auth");
  const forgot = useForgotPassword();
  const form = useForm<EmailFormData>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });
  return (
    <AuthLayout>
      <h1>{t("forgot.title")}</h1>
      {forgot.isSuccess ? (
        <div className="callout ok mt-4">
          <MailCheck className="h-5 w-5 shrink-0" />
          <div>{t("forgot.sent")}</div>
        </div>
      ) : (
        <>
          <p className="muted">{t("forgot.intro")}</p>
          <Form {...form}>
            <form className="mt-5 flex flex-col gap-4" onSubmit={form.handleSubmit((v) => forgot.mutate(v.email))} noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t("fields.emailPlaceholder")} autoComplete="email" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="h-10" loading={forgot.isPending}>
                {t("forgot.submit")}
              </Button>
            </form>
          </Form>
        </>
      )}
      <Link to={Routes.auth.sign_in} className="caption mt-5">
        {t("forgot.back")}
      </Link>
    </AuthLayout>
  );
};

export const ResetPasswordPage: FC = () => {
  const { t } = useTranslation("auth");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const reset = useResetPassword();
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);
  const form = useForm<ResetFormData>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  return (
    <AuthLayout>
      <h1>{t("reset.title")}</h1>
      {!token ? (
        <p className="muted">{t("reset.incomplete")}</p>
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
                  <FormLabel>{t("reset.newPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder={t("fields.passwordNewPlaceholder")} autoComplete="new-password" className="h-10" {...field} />
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
                  <FormLabel>{t("reset.confirm")}</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder={t("reset.confirmPlaceholder")} autoComplete="new-password" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-10" loading={reset.isPending}>
              {t("reset.submit")}
            </Button>
          </form>
        </Form>
      )}
      <Link to={Routes.auth.forgot_password} className="caption mt-5">
        {t("reset.requestNew")}
      </Link>
    </AuthLayout>
  );
};

export const VerifyEmailPage: FC = () => {
  const { t } = useTranslation("auth");
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
      <h1>{t("verify.title")}</h1>
      {verify.isPending || (!verify.isSuccess && !verify.isError && token) ? (
        <p className="muted mt-2">{t("verify.verifying")}</p>
      ) : verify.isSuccess ? (
        <div className="callout ok mt-4">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>{t("verify.success")}</div>
        </div>
      ) : (
        <div className="callout bad mt-4">
          <XCircle className="h-5 w-5 shrink-0" />
          <div>{verify.error?.message ?? t("verify.invalid")}</div>
        </div>
      )}
      <Button asChild className="mt-5 h-10 self-start">
        <Link to={isLoggedIn ? Routes.workspaces : Routes.auth.sign_in}>{isLoggedIn ? t("verify.continue") : t("signIn.submit")}</Link>
      </Button>
    </AuthLayout>
  );
};

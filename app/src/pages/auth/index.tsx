import { useCallback, useEffect, useMemo, type FC } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import AuthLayout from "./components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountryFlag } from "@/components/ui/country-flag";
import { ClientCountryOptions } from "@/config/constants/dropdowns/client-country.options";
import { FilterSelect } from "@/components/ui/filter-select";
import { DEFAULT_TIME_ZONE, TimeZoneOptions } from "@/config/constants/dropdowns/shared/time-zone.options";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { authKeys, useAcceptInvitation, useInvitation, useSignIn, useSignOut, useSignUp, useSwitchContext } from "@/features/auth/hooks/use-auth";
import { getMe } from "@/features/auth/services/auth.services";
import { useCreateOrganization } from "@/features/workspace/hooks/use-workspace-data";
import type { InvitationInfo } from "@/features/auth/interfaces/auth.interfaces";
import { signInSchema, signUpSchema, workspaceSetupSchema, type SignInFormData, type SignUpFormData, type WorkspaceSetupFormData } from "./validation-schemas/auth.schema";

const InviteNote: FC<{ invitation: InvitationInfo }> = ({ invitation }) => {
  const { t } = useTranslation("auth");
  return (
  <div className="callout mt-4">
    <Mail className="h-5 w-5 shrink-0 text-primary" />
    <div>
      <b className="ink">
        {invitation.type === "TEAM"
          ? t("invite.teamTitle", { inviter: invitation.invited_by ?? invitation.organization_name, organization: invitation.organization_name })
          : t("invite.portalTitle", { organization: invitation.organization_name })}
      </b>
      <div className="muted">
        {invitation.status !== "PENDING" ? (
          <>{t("invite.notPending", { status: t(`invite.status.${invitation.status}`, { defaultValue: invitation.status.toLowerCase() }) })}</>
        ) : (
          <>
            <Trans
              t={t}
              i18nKey={
                invitation.type === "TEAM" && invitation.role
                  ? invitation.account_exists ? "invite.signInAsRole" : "invite.createAsRole"
                  : invitation.account_exists ? "invite.signInPortal" : "invite.createPortal"
              }
              values={{ email: invitation.email, role: invitation.role ? t(`roles.${invitation.role}`, { defaultValue: invitation.role }) : "" }}
              components={{ b: <b className="ink" /> }}
            />
          </>
        )}
      </div>
      {invitation.message && <p className="mt-2 italic">“{invitation.message}”</p>}
    </div>
  </div>
  );
};

/** Single sign-in / create-account page for team members, owners and clients. */
const AuthPage: FC = () => {
  const { t } = useTranslation("auth");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = params.get("invite");
  const next = params.get("next");
  const { isLoggedIn, user } = useAuthStore();
  const invitation = useInvitation(inviteToken);
  // With an invitation the tabs are hidden, so the mode follows whether the invitee already has an account.
  const mode = invitation.data
    ? invitation.data.account_exists ? "signin" : "signup"
    : params.get("mode") === "signup" ? "signup" : "signin";
  const signIn = useSignIn();
  const signUp = useSignUp();
  const signOut = useSignOut();
  const accept = useAcceptInvitation();
  const switchContext = useSwitchContext();
  const createOrg = useCreateOrganization();
  const queryClient = useQueryClient();

  const workspaceForm = useForm<WorkspaceSetupFormData>({
    resolver: zodResolver(workspaceSetupSchema),
    defaultValues: { name: "", time_zone: DEFAULT_TIME_ZONE, contact_email: user?.email ?? "", address: "" },
  });

  // Work email starts as the email used at registration.
  useEffect(() => {
    if (user?.email && !workspaceForm.getValues("contact_email")) workspaceForm.setValue("contact_email", user.email);
  }, [user?.email, workspaceForm]);
  const signInForm = useForm<SignInFormData>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", country: "", password: "", terms: false },
  });

  // Prefill from the invitation and pick the right mode.
  useEffect(() => {
    if (!invitation.data) return;
    signInForm.reset({ ...signInForm.getValues(), email: invitation.data.email });
    const prefill = invitation.data.client_prefill;
    signUpForm.reset({
      ...signUpForm.getValues(),
      email: invitation.data.email,
      ...(prefill && {
        first_name: prefill.first_name,
        last_name: prefill.last_name,
        phone: prefill.phone ?? "",
        country: prefill.country ?? "",
      }),
    });
    if (!params.get("mode")) {
      setParams((p) => {
        p.set("mode", invitation.data!.account_exists ? "signin" : "signup");
        return p;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation.data]);

  /**
   * Where to go once signed in. The workspace chooser is only for people who have both a
   * workspace and client portals (or several of either); a single context opens directly,
   * and a brand-new account without any context is asked to create a workspace.
   */
  const routeAfterAuth = useCallback(async () => {
    if (next) return navigate(next, { replace: true });
    try {
      const me = await queryClient.fetchQuery({ queryKey: authKeys.me, queryFn: getMe, staleTime: 0 });
      const { workspaces, portals } = me;
      if (workspaces.length + portals.length === 1) {
        return switchContext.mutate(workspaces.length ? { organization_id: workspaces[0].organization_id } : { client_user_id: portals[0].client_user_id });
      }
      if (!workspaces.length && !portals.length) return navigate(`${Routes.workspaces}?create=1`, { replace: true });
    } catch {
      /* fall through to the chooser */
    }
    navigate(Routes.workspaces, { replace: true });
  }, [next, navigate, queryClient, switchContext]);

  // Right after sign-up (no invitation) the next step asks for the company / workspace name.
  const showWorkspaceStep = isLoggedIn && signUp.isSuccess && !inviteToken && !createOrg.isSuccess;

  // Already signed in without an invitation → open the right place.
  useEffect(() => {
    if (isLoggedIn && !inviteToken && !signIn.isPending && !signUp.isPending && !signUp.isSuccess) void routeAfterAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, inviteToken, signIn.isPending, signUp.isPending, signUp.isSuccess]);

  const acceptAndOpen = async () => {
    if (!inviteToken) return;
    const result = await accept.mutateAsync(inviteToken);
    switchContext.mutate(
      result.context.type === "workspace" ? { organization_id: result.context.organization_id } : { client_user_id: result.context.client_user_id },
    );
  };

  const afterAuth = async () => {
    if (inviteToken && invitation.data?.status === "PENDING") {
      try {
        await acceptAndOpen();
      } catch {
        navigate(Routes.workspaces, { replace: true });
      }
    } else {
      await routeAfterAuth();
    }
  };

  const onCreateWorkspace = ({ address, ...v }: WorkspaceSetupFormData) =>
    createOrg.mutate({ ...v, ...(address ? { address } : {}) }, { onSuccess: (org) => switchContext.mutate({ organization_id: org.id }) });

  const setMode = (m: "signin" | "signup") =>
    setParams((p) => {
      p.set("mode", m);
      return p;
    });

  const busy = signIn.isPending || signUp.isPending || accept.isPending || switchContext.isPending;
  const creating = createOrg.isPending || switchContext.isPending;
  const inviteEmail = invitation.data?.email;
  const lockedEmail = useMemo(() => !!inviteEmail && invitation.data?.status === "PENDING", [inviteEmail, invitation.data]);
  // Keep the validated form value in sync with the invitation once the field is mounted.
  useEffect(() => {
    if (!lockedEmail || !inviteEmail) return;
    signInForm.setValue("email", inviteEmail);
    signUpForm.setValue("email", inviteEmail);
  }, [lockedEmail, inviteEmail, mode, signInForm, signUpForm]);

  if (isLoggedIn && inviteToken) {
    return (
      <AuthLayout>
        <h1>{t("accept.title")}</h1>
        {invitation.isPending ? <Skeleton className="mt-4 h-20 w-full" /> : invitation.data ? <InviteNote invitation={invitation.data} /> : <p className="muted mt-4">{t("accept.invalidLink")}</p>}
        <p className="muted mt-4">
          <Trans t={t} i18nKey="accept.signedInAs" values={{ email: user?.email }} components={{ b: <b className="ink" /> }} />
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={acceptAndOpen} loading={accept.isPending || switchContext.isPending} disabled={invitation.data?.status !== "PENDING"}>
            {t("accept.acceptAndOpen")}
          </Button>
          <Button variant="outline" onClick={() => signOut.mutate()}>
            {t("accept.differentAccount")}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (showWorkspaceStep) {
    return (
      <AuthLayout>
        <h1>{t("workspaceStep.title")}</h1>
        <p className="muted">{t("workspaceStep.subtitle")}</p>
        <Form {...workspaceForm}>
          <form className="mt-5 flex flex-col gap-4" onSubmit={workspaceForm.handleSubmit(onCreateWorkspace)} noValidate>
            <FormField
              control={workspaceForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workspaceStep.company")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("workspaceStep.companyPlaceholder")} autoFocus autoComplete="organization" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={workspaceForm.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workspaceStep.workEmail")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t("workspaceStep.workEmailPlaceholder")} autoComplete="email" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={workspaceForm.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workspaceStep.address")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("workspaceStep.addressPlaceholder")} autoComplete="street-address" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={workspaceForm.control}
              name="time_zone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workspaceStep.timeZone")}</FormLabel>
                  <FilterSelect label={t("workspaceStep.timeZone")} size="default" className="w-full" value={field.value} onChange={field.onChange} options={TimeZoneOptions} />
                  <p className="caption">{t("workspaceStep.timeZoneHint")}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-10 w-full" loading={creating}>
              {t("workspaceStep.submit")}
            </Button>
          </form>
        </Form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1>{mode === "signup" ? t("signUp.title") : t("signIn.title")}</h1>
      <p className="muted">
        {mode === "signup" ? t("signUp.subtitle") : t("signIn.subtitle")}
      </p>
      {invitation.data && <InviteNote invitation={invitation.data} />}

      {/* Invitations already determine whether to sign in or create an account. */}
      {!inviteToken && (
        <div className="segmented mt-5 self-start" role="tablist" aria-label={t("tabs.label")}>
          <button role="tab" aria-selected={mode === "signin"} className={cn(mode === "signin" && "active")} onClick={() => setMode("signin")}>
            {t("tabs.signIn")}
          </button>
          <button role="tab" aria-selected={mode === "signup"} className={cn(mode === "signup" && "active")} onClick={() => setMode("signup")}>
            {t("tabs.signUp")}
          </button>
        </div>
      )}

      {mode === "signin" ? (
        <Form key="signin" {...signInForm}>
          <form key="signin" className="mt-4 flex flex-col gap-4" onSubmit={signInForm.handleSubmit((v) => signIn.mutate({ ...v, email: lockedEmail ? inviteEmail! : v.email }, { onSuccess: afterAuth }))} noValidate>
            <FormField
              control={signInForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t("fields.emailPlaceholder")} autoComplete="username" readOnly={lockedEmail} className="h-10" {...field} value={lockedEmail ? inviteEmail : field.value} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signInForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("fields.password")}</FormLabel>
                    <Link to={Routes.auth.forgot_password} className="caption">
                      {t("signIn.forgot")}
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput placeholder={t("fields.passwordPlaceholder")} autoComplete="current-password" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-10 w-full" loading={busy}>
              {t("signIn.submit")}
            </Button>
          </form>
        </Form>
      ) : (
        <Form key="signup" {...signUpForm}>
          <form className="mt-4 flex flex-col gap-4" onSubmit={signUpForm.handleSubmit(({ terms: _terms, ...v }) => signUp.mutate({ ...v, email: lockedEmail ? inviteEmail! : v.email }, { onSuccess: () => (inviteToken ? afterAuth() : undefined) }))} noValidate>
            <div className="form-grid">
              <FormField
                control={signUpForm.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.firstName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("fields.firstNamePlaceholder")} autoComplete="given-name" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.lastName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("fields.lastNamePlaceholder")} autoComplete="family-name" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="form-grid">
            <FormField
              control={signUpForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t("fields.emailPlaceholder")} autoComplete="email" readOnly={lockedEmail} className="h-10" {...field} value={lockedEmail ? inviteEmail : field.value} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signUpForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.phone")}</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder={t("fields.phonePlaceholder")} autoComplete="tel" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
            <FormField
              control={signUpForm.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.country")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t("fields.countryPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ClientCountryOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <CountryFlag country={o.value} title={o.label} />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signUpForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.password")}</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder={t("fields.passwordNewPlaceholder")} autoComplete="new-password" className="h-10" {...field} />
                  </FormControl>
                  <p className="hint caption">{t("fields.passwordHint")}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signUpForm.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 text-sm">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                    </FormControl>
                    {t("signUp.terms")}
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-10 w-full" loading={busy}>
              {t("signUp.submit")}
            </Button>
          </form>
        </Form>
      )}
      <p className="caption mt-4">{t("footerNote")}</p>
      <p className="caption mt-2">
        {t("needHelp")}{" "}
        <Link to={Routes.contact} className="font-medium underline">
          {t("contactUs")}
        </Link>
      </p>
    </AuthLayout>
  );
};

export default AuthPage;

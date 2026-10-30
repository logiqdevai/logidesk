import { useEffect, useMemo, type FC } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import AuthLayout from "./components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useAcceptInvitation, useInvitation, useSignIn, useSignOut, useSignUp, useSwitchContext } from "@/features/auth/hooks/use-auth";
import { getOrganizationRoleLabel } from "@/config/constants/dropdowns/users/organization-role-form.options";
import type { InvitationInfo } from "@/features/auth/interfaces/auth.interfaces";
import { signInSchema, signUpSchema, type SignInFormData, type SignUpFormData } from "./validation-schemas/auth.schema";

const InviteNote: FC<{ invitation: InvitationInfo }> = ({ invitation }) => (
  <div className="callout mt-4">
    <Mail className="h-5 w-5 shrink-0 text-primary" />
    <div>
      <b className="ink">
        {invitation.type === "TEAM"
          ? `${invitation.invited_by ?? invitation.organization_name} invited you to join ${invitation.organization_name}`
          : `${invitation.organization_name} invited you to their client portal`}
      </b>
      <div className="muted">
        {invitation.status !== "PENDING" ? (
          <>This invitation is {invitation.status.toLowerCase()}. Ask for a new one if you still need access.</>
        ) : (
          <>
            {invitation.account_exists ? "Sign in" : "Create an account"} with <b className="ink">{invitation.email}</b>
            {invitation.type === "TEAM" && invitation.role ? ` to join as ${getOrganizationRoleLabel(invitation.role)}.` : " to open the shared portal."}
          </>
        )}
      </div>
      {invitation.message && <p className="mt-2 italic">“{invitation.message}”</p>}
    </div>
  </div>
);

/** Single sign-in / create-account page for team members, owners and clients. */
const AuthPage: FC = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = params.get("invite");
  const next = params.get("next");
  const mode = params.get("mode") === "signup" ? "signup" : "signin";
  const { isLoggedIn, user } = useAuthStore();
  const invitation = useInvitation(inviteToken);
  const signIn = useSignIn();
  const signUp = useSignUp();
  const signOut = useSignOut();
  const accept = useAcceptInvitation();
  const switchContext = useSwitchContext();

  const signInForm = useForm<SignInFormData>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "", terms: false },
  });

  // Prefill from the invitation and pick the right mode.
  useEffect(() => {
    if (!invitation.data) return;
    signInForm.reset({ ...signInForm.getValues(), email: invitation.data.email });
    signUpForm.reset({ ...signUpForm.getValues(), email: invitation.data.email });
    if (!params.get("mode")) {
      setParams((p) => {
        p.set("mode", invitation.data!.account_exists ? "signin" : "signup");
        return p;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation.data]);

  // Signed in without an invitation → workspace chooser.
  useEffect(() => {
    if (isLoggedIn && !inviteToken && !signIn.isPending && !signUp.isPending) navigate(next || `${Routes.workspaces}?auto=1`, { replace: true });
  }, [isLoggedIn, inviteToken, next, navigate, signIn.isPending, signUp.isPending]);

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
      navigate(next || `${Routes.workspaces}?auto=1`, { replace: true });
    }
  };

  const setMode = (m: "signin" | "signup") =>
    setParams((p) => {
      p.set("mode", m);
      return p;
    });

  const busy = signIn.isPending || signUp.isPending || accept.isPending || switchContext.isPending;
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
        <h1>Accept invitation</h1>
        {invitation.isPending ? <Skeleton className="mt-4 h-20 w-full" /> : invitation.data ? <InviteNote invitation={invitation.data} /> : <p className="muted mt-4">This invitation link is not valid.</p>}
        <p className="muted mt-4">
          You are signed in as <b className="ink">{user?.email}</b>.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={acceptAndOpen} loading={accept.isPending || switchContext.isPending} disabled={invitation.data?.status !== "PENDING"}>
            Accept and open
          </Button>
          <Button variant="outline" onClick={() => signOut.mutate()}>
            Use a different account
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1>{mode === "signup" ? "Create account" : "Sign in"}</h1>
      <p className="muted">
        {mode === "signup" ? "One account for every workspace and client portal you belong to." : "Welcome back. One account for every workspace and client portal you belong to."}
      </p>
      {invitation.data && <InviteNote invitation={invitation.data} />}

      <div className="segmented mt-5 self-start" role="tablist" aria-label="Sign in or create account">
        <button role="tab" aria-selected={mode === "signin"} className={cn(mode === "signin" && "active")} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button role="tab" aria-selected={mode === "signup"} className={cn(mode === "signup" && "active")} onClick={() => setMode("signup")}>
          Create account
        </button>
      </div>

      {mode === "signin" ? (
        <Form {...signInForm}>
          <form className="mt-4 flex flex-col gap-4" onSubmit={signInForm.handleSubmit((v) => signIn.mutate({ ...v, email: lockedEmail ? inviteEmail! : v.email }, { onSuccess: afterAuth }))} noValidate>
            <FormField
              control={signInForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@company.com" autoComplete="username" readOnly={lockedEmail} className="h-10" {...field} value={lockedEmail ? inviteEmail : field.value} />
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
                    <FormLabel>Password</FormLabel>
                    <Link to={Routes.auth.forgot_password} className="caption">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput placeholder="Enter your password" autoComplete="current-password" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-10 w-full" loading={busy}>
              Sign in
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...signUpForm}>
          <form className="mt-4 flex flex-col gap-4" onSubmit={signUpForm.handleSubmit(({ terms: _terms, ...v }) => signUp.mutate({ ...v, email: lockedEmail ? inviteEmail! : v.email }, { onSuccess: afterAuth }))} noValidate>
            <div className="form-grid">
              <FormField
                control={signUpForm.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="Alex" autoComplete="given-name" className="h-10" {...field} />
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
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input placeholder="Morgan" autoComplete="family-name" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={signUpForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@company.com" autoComplete="email" readOnly={lockedEmail} className="h-10" {...field} value={lockedEmail ? inviteEmail : field.value} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signUpForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="At least 8 characters" autoComplete="new-password" className="h-10" {...field} />
                  </FormControl>
                  <p className="hint caption">At least 8 characters.</p>
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
                    I agree to the terms and privacy policy
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-10 w-full" loading={busy}>
              Create account
            </Button>
          </form>
        </Form>
      )}
      <p className="caption mt-4">After signing in you choose a workspace, create a new one, or open a client portal you were invited to.</p>
    </AuthLayout>
  );
};

export default AuthPage;

import { useEffect, useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2, MailWarning, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BrandLogo, EmptyState, TableSkeleton } from "@/components/ui/page-elements";
import { FilterSelect } from "@/components/ui/filter-select";
import { useMe, useResendVerification, useSignOut, useSwitchContext } from "@/features/auth/hooks/use-auth";
import { useCreateOrganization } from "@/features/workspace/hooks/use-workspace-data";
import { getOrganizationRoleLabel } from "@/config/constants/dropdowns/users/organization-role-form.options";
import { TimeZoneOptions } from "@/config/constants/dropdowns/shared/time-zone.options";
import { fullName, initials, pluralize } from "@/lib/format";
import { workspaceSchema, type WorkspaceFormData } from "@/pages/auth/validation-schemas/auth.schema";

const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** After sign-in: choose a workspace, create one, or open a client portal. */
const WorkspacesPage: FC = () => {
  const me = useMe();
  const signOut = useSignOut();
  const switchContext = useSwitchContext();
  const create = useCreateOrganization();
  const resend = useResendVerification();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get("create") === "1");
  const form = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "", time_zone: TimeZoneOptions.some((t) => t.id === browserZone) ? browserZone : "UTC" },
  });

  useEffect(() => {
    if (params.get("create") === "1") setOpen(true);
  }, [params]);

  // Right after sign-in, go straight to the only workspace or portal the user has.
  useEffect(() => {
    if (params.get("auto") !== "1" || !me.data || switchContext.isPending) return;
    const { workspaces, portals } = me.data;
    params.delete("auto");
    setParams(params, { replace: true });
    if (workspaces.length + portals.length !== 1) return;
    switchContext.mutate(workspaces.length ? { organization_id: workspaces[0].organization_id } : { client_user_id: portals[0].client_user_id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data]);

  const closeDialog = (o: boolean) => {
    if (create.isPending) return;
    setOpen(o);
    if (!o && params.get("create")) {
      params.delete("create");
      setParams(params, { replace: true });
    }
  };

  const onCreate = (v: WorkspaceFormData) =>
    create.mutate(v, {
      onSuccess: (org) => {
        setOpen(false);
        switchContext.mutate({ organization_id: org.id });
      },
    });

  const data = me.data;
  return (
    <main className="page max-w-[760px] pt-12">
      <BrandLogo className="!p-0" />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[44px] tracking-[-1px]">Choose a workspace</h1>
          <p className="muted mt-2">
            {data ? (
              <>
                Signed in as <b className="ink">{fullName(data.user) || data.user.email}</b> · {data.user.email}
              </>
            ) : (
              " "
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut.mutate()}>
          Sign out
        </Button>
      </div>

      {data && !data.user.email_verified && (
        <div className="callout warn mt-5">
          <MailWarning className="h-5 w-5 shrink-0" />
          <div className="grow">
            <b className="ink">Verify your email address.</b> We sent a link to {data.user.email}.
          </div>
          <Button size="sm" variant="outline" loading={resend.isPending} onClick={() => resend.mutate()}>
            Resend
          </Button>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2>Your workspaces</h2>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus />
            Create workspace
          </Button>
        </div>
        <div className="card">
          {me.isPending ? (
            <TableSkeleton rows={2} />
          ) : !data?.workspaces.length && data?.portals.length ? (
            <p className="muted p-5">You are not a member of any business workspace. Create one if you want to collect documents from your own clients.</p>
          ) : !data?.workspaces.length ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title="No workspaces yet"
              description="Create a workspace for your business. You become its Owner and can invite your team."
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus />
                  Create workspace
                </Button>
              }
            />
          ) : (
            data.workspaces.map((w) => (
              <button
                key={w.organization_id}
                className="list-row w-full text-left hover:bg-[#f8f5ee]"
                onClick={() => switchContext.mutate({ organization_id: w.organization_id })}
                disabled={switchContext.isPending}
              >
                <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--g-ink)] text-xs font-semibold text-[var(--g-on-dark)]">{initials(w.name)}</span>
                <span className="grow">
                  <span className="cell-main block">{w.name}</span>
                  <span className="cell-sub">
                    {getOrganizationRoleLabel(w.role)} · {pluralize(w.member_count, "member")}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4">Client portals</h2>
        <div className="card">
          {me.isPending ? (
            <TableSkeleton rows={1} />
          ) : !data?.portals.length ? (
            <p className="muted p-5">You have not been invited to any client portals.</p>
          ) : (
            data.portals.map((p) => (
              <button
                key={p.client_user_id}
                className="list-row w-full text-left hover:bg-[#f8f5ee]"
                onClick={() => switchContext.mutate({ client_user_id: p.client_user_id })}
                disabled={switchContext.isPending}
              >
                <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--g-primary-tint)] text-xs font-semibold text-[var(--g-primary-active)]">{initials(p.organization_name)}</span>
                <span className="grow">
                  <span className="cell-main block">{p.organization_name}</span>
                  <span className="cell-sub">
                    Client portal · {p.client_name}
                    {p.company ? ` · ${p.company}` : ""}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
        <p className="caption mt-2">Organizations that invited you as a client. Your documents stay separate from any workspace you work in.</p>
      </section>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[26px] font-medium">Create a workspace</DialogTitle>
            <DialogDescription>You become its Owner. Invite teammates afterwards.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form id="create-ws" className="flex flex-col gap-4" onSubmit={form.handleSubmit(onCreate)} noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Meridian Accounting" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time_zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time zone</FormLabel>
                    <FilterSelect label="Time zone" size="default" className="w-full" value={field.value} onChange={field.onChange} options={TimeZoneOptions} />
                    <p className="caption">Reminders are sent in this time zone. You can change it later.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="create-ws" loading={create.isPending || switchContext.isPending}>
              Create workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default WorkspacesPage;

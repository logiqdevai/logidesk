import { LanguageSwitch } from "@/components/ui/language-switch";
import { useEffect, useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BrandLogo, EmptyState, TableSkeleton } from "@/components/ui/page-elements";
import { RoleGate } from "@/components/access/role-gate";
import { CreateWorkspaceAccess } from "@/config/constants/access/workspace-access";
import { useRoleAccess } from "@/hooks/use-role-access";
import { FilterSelect } from "@/components/ui/filter-select";
import { useMe, useSignOut, useSwitchContext } from "@/features/auth/hooks/use-auth";
import { useCreateOrganization } from "@/features/workspace/hooks/use-workspace-data";
import { DEFAULT_TIME_ZONE, TimeZoneOptions } from "@/config/constants/dropdowns/shared/time-zone.options";
import { fullName, initials } from "@/lib/format";
import { workspaceSchema, type WorkspaceFormData } from "@/pages/auth/validation-schemas/auth.schema";

/** After sign-in: choose a workspace, create one, or open a client portal. */
const WorkspacesPage: FC = () => {
  const { t } = useTranslation("workspaces");
  const me = useMe();
  const signOut = useSignOut();
  const switchContext = useSwitchContext();
  const create = useCreateOrganization();
  const canCreate = useRoleAccess(CreateWorkspaceAccess);
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(canCreate && params.get("create") === "1");
  const form = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "", time_zone: DEFAULT_TIME_ZONE },
  });

  useEffect(() => {
    if (canCreate && params.get("create") === "1") setOpen(true);
  }, [params, canCreate]);

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
      <div className="flex items-center justify-between">
        <BrandLogo className="!p-0" />
        <span className="flex items-center gap-2">
        <LanguageSwitch />
        <Button size="sm" onClick={() => signOut.mutate()}>
          {t("signOut")}
        </Button>
        </span>
      </div>
      <div className="mt-6">
        <div>
          <h1 className="display text-[44px] tracking-[-1px]">{t("title")}</h1>
          <p className="muted mt-2">
            {data ? (
              <>
                <Trans t={t} i18nKey="signedInAs" values={{ name: fullName(data.user) || data.user.email }} components={{ b: <b className="ink" /> }} /> · {data.user.email}
              </>
            ) : (
              " "
            )}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2>{t("yourWorkspaces")}</h2>
          <RoleGate {...CreateWorkspaceAccess}>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus />
              {t("create")}
            </Button>
          </RoleGate>
        </div>
        <div className="card">
          {me.isPending ? (
            <TableSkeleton rows={2} />
          ) : !data?.workspaces.length && data?.portals.length ? (
            <p className="muted p-5">{t("noMembership")}</p>
          ) : !data?.workspaces.length ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title={t("empty.title")}
              description={t("empty.description")}
              action={
                <RoleGate {...CreateWorkspaceAccess}>
                  <Button onClick={() => setOpen(true)}>
                    <Plus />
                    {t("create")}
                  </Button>
                </RoleGate>
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
                <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--g-ink)] text-[12px] font-semibold text-[var(--g-on-dark)]">{initials(w.name)}</span>
                <span className="grow">
                  <span className="cell-main block">{w.name}</span>
                  <span className="cell-sub">
                    {t(`auth:roles.${w.role}`, { defaultValue: w.role })} · {t("members", { count: w.member_count })}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4">{t("portals.title")}</h2>
        <div className="card">
          {me.isPending ? (
            <TableSkeleton rows={1} />
          ) : !data?.portals.length ? (
            <p className="muted p-5">{t("portals.empty")}</p>
          ) : (
            data.portals.map((p) => (
              <button
                key={p.client_user_id}
                className="list-row w-full text-left hover:bg-[#f8f5ee]"
                onClick={() => switchContext.mutate({ client_user_id: p.client_user_id })}
                disabled={switchContext.isPending}
              >
                <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--g-primary-tint)] text-[12px] font-semibold text-[var(--g-primary-active)]">{initials(p.organization_name)}</span>
                <span className="grow">
                  <span className="cell-main block">{p.organization_name}</span>
                  <span className="cell-sub">
                    {t("portals.rowLabel", { name: p.client_name })}
                    {p.company ? ` · ${p.company}` : ""}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
        <p className="caption mt-2">{t("portals.note")}</p>
      </section>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[26px] font-medium">{t("dialog.title")}</DialogTitle>
            <DialogDescription>{t("dialog.description")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form id="create-ws" className="flex flex-col gap-4" onSubmit={form.handleSubmit(onCreate)} noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dialog.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("dialog.namePlaceholder")} autoFocus {...field} />
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
                    <FormLabel>{t("dialog.timeZone")}</FormLabel>
                    <FilterSelect label={t("dialog.timeZone")} size="default" className="w-full" value={field.value} onChange={field.onChange} options={TimeZoneOptions} />
                    <p className="caption">{t("dialog.timeZoneHint")}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog(false)} disabled={create.isPending}>
              {t("dialog.cancel")}
            </Button>
            <Button type="submit" form="create-ws" loading={create.isPending || switchContext.isPending}>
              {t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default WorkspacesPage;

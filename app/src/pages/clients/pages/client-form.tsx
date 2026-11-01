import { useEffect, useMemo, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountryFlag } from "@/components/ui/country-flag";
import { ClientCountryOptions } from "@/config/constants/dropdowns/client-country.options";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DetailSkeleton, PageHeader } from "@/components/ui/page-elements";
import { useClient, useCreateClient, useTeam, useUpdateClient } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { getOrganizationRoleLabel } from "@/config/constants/dropdowns/users/organization-role-form.options";
import { Routes } from "@/routes/routes";
import type { ApiError } from "@/lib/api-error";
import { makeClientSchema, type ClientFormValues } from "../validation-schemas/client.schema";

const blank = (v?: string | null) => (v && v.trim() ? v.trim() : null);

/** Create or edit a client. Only first and last name are required. */
const ClientFormPage: FC = () => {
  const { t } = useTranslation("clients");
  const schema = useMemo(() => makeClientSchema(t), [t]);
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = !!id;
  const client = useClient(id);
  const team = useTeam();
  const { can } = useWorkspace();
  const create = useCreateClient();
  const update = useUpdateClient();
  const canAssign = can(Permissions.CLIENTS_ASSIGN_EMPLOYEES);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      company: "",
      email: "",
      phone: "",
      tax_id: "",
      country: "GR",
      address: "",
      company_info: "",
      internal_note: "",
      assignee_member_ids: [],
      send_invitation: false,
    },
  });

  useEffect(() => {
    if (client.data) {
      const c = client.data;
      form.reset({
        first_name: c.first_name,
        last_name: c.last_name,
        company: c.company ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        tax_id: c.tax_id ?? "",
        country: c.country ?? "",
        address: c.address ?? "",
        company_info: c.company_info ?? "",
        internal_note: "",
        assignee_member_ids: c.assignees.map((a) => a.member_id),
        send_invitation: false,
      });
    }
  }, [client.data, form]);

  // New clients are assigned to the creator by default.
  useEffect(() => {
    if (!editing && team.data && !form.getValues("assignee_member_ids").length) {
      const me = team.data.members.find((m) => m.is_you);
      if (me) form.setValue("assignee_member_ids", [me.member_id]);
    }
  }, [team.data, editing, form]);

  const onError = (error: Error) => {
    const fields = (error as ApiError).fieldErrors ?? {};
    for (const [k, msg] of Object.entries(fields)) form.setError(k as keyof ClientFormValues, { message: msg });
  };

  const onSubmit = (v: ClientFormValues) => {
    const dto = {
      first_name: v.first_name,
      last_name: v.last_name,
      company: blank(v.company),
      email: blank(v.email),
      phone: blank(v.phone),
      tax_id: blank(v.tax_id),
      country: blank(v.country),
      address: blank(v.address),
      company_info: blank(v.company_info),
      ...(canAssign ? { assignee_member_ids: v.assignee_member_ids } : {}),
    };
    if (editing) {
      update.mutate({ id: id!, ...dto }, { onSuccess: () => navigate(Routes.clients.detail(id!)), onError });
    } else {
      create.mutate(
        { ...dto, internal_note: blank(v.internal_note), send_invitation: v.send_invitation && !!blank(v.email) },
        { onSuccess: (c) => navigate(Routes.clients.detail(c.id)), onError },
      );
    }
  };

  if (editing && client.isPending) return <DetailSkeleton />;

  const field = (name: keyof ClientFormValues, label: string, props: { type?: string; placeholder?: string; optional?: boolean; full?: boolean; area?: boolean } = {}) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field: f }) => (
        <FormItem className={props.full ? "full" : undefined}>
          <FormLabel>
            {label} {props.optional && <span className="soft font-normal">({t("form.optional")})</span>}
          </FormLabel>
          <FormControl>
            {props.area ? (
              <Textarea rows={3} placeholder={props.placeholder} {...f} value={f.value as string} />
            ) : (
              <Input type={props.type ?? "text"} placeholder={props.placeholder} className="h-10" {...f} value={f.value as string} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        crumbs={[{ label: t("list.title"), to: Routes.clients.root }, ...(editing && client.data ? [{ label: `${client.data.first_name} ${client.data.last_name}`, to: Routes.clients.detail(id!) }] : []), { label: editing ? t("form.crumbEdit") : t("form.crumbNew") }]}
        title={editing ? t("form.editTitle") : t("form.addTitle")}
        description={t("form.description")}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <section className="card pad">
            <h3 className="mb-4">{t("form.contact")}</h3>
            <div className="form-grid">
              {field("first_name", t("form.fields.firstName"), { placeholder: t("form.placeholders.firstName") })}
              {field("last_name", t("form.fields.lastName"), { placeholder: t("form.placeholders.lastName") })}
              {field("company", t("form.fields.company"), { optional: true, placeholder: t("form.placeholders.company") })}
              {field("email", t("form.fields.email"), { type: "email", placeholder: t("form.placeholders.email") })}
              {field("phone", t("form.fields.phone"), { optional: true, placeholder: t("form.placeholders.phone") })}
              {field("tax_id", t("form.fields.taxId"), { optional: true, placeholder: t("form.placeholders.taxId") })}
              <FormField
                control={form.control}
                name="country"
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.fields.country")} <span className="soft font-normal">({t("form.optional")})</span>
                    </FormLabel>
                    <Select value={f.value || "none"} onValueChange={(v) => f.onChange(v === "none" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t("form.placeholders.country")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("form.noCountry")}</SelectItem>
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
              {field("address", t("form.fields.address"), { optional: true, full: true, placeholder: t("form.placeholders.address") })}
              {field("company_info", t("form.fields.companyInfo"), { optional: true, full: true, area: true, placeholder: t("form.placeholders.companyInfo") })}
            </div>
          </section>

          <section className="card pad">
            <h3 className="mb-1">{t("form.assignedEmployees")}</h3>
            <p className="muted mb-4">{t("form.assignedEmployeesHint")}</p>
            {canAssign ? (
              <FormField
                control={form.control}
                name="assignee_member_ids"
                render={({ field: f }) => (
                  <div className="card">
                    {(team.data?.members ?? []).map((m) => (
                      <label key={m.member_id} className="list-row cursor-pointer !py-2.5">
                        <Checkbox
                          checked={f.value.includes(m.member_id)}
                          onCheckedChange={(c) => f.onChange(c ? [...f.value, m.member_id] : f.value.filter((x) => x !== m.member_id))}
                          aria-label={m.name}
                        />
                        <span className="grow">
                          <span className="cell-main block">
                            {m.name}
                            {m.is_you ? ` (${t("form.you")})` : ""}
                          </span>
                          <span className="cell-sub">{getOrganizationRoleLabel(m.role)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              />
            ) : (
              <p className="muted">{t("form.noAssignPermission")}</p>
            )}
          </section>

          {!editing && (
            <section className="card pad flex flex-col gap-4">
              {field("internal_note", t("form.fields.internalNote"), { optional: true, area: true, placeholder: t("form.placeholders.internalNote") })}
              <FormField
                control={form.control}
                name="send_invitation"
                render={({ field: f }) => (
                  <FormItem>
                    <label className="flex cursor-pointer items-start gap-3">
                      <Checkbox checked={f.value} onCheckedChange={(c) => f.onChange(c === true)} aria-label={t("form.sendInvitation")} />
                      <span>
                        <span className="cell-main block">{t("form.sendInvitation")}</span>
                        <span className="cell-sub">{t("form.sendInvitationHint")}</span>
                      </span>
                    </label>
                  </FormItem>
                )}
              />
            </section>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(editing ? Routes.clients.detail(id!) : Routes.clients.root)}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? t("form.save") : t("form.add")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ClientFormPage;

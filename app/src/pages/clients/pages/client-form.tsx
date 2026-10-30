import { useEffect, type FC } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DetailSkeleton, PageHeader } from "@/components/ui/page-elements";
import { useClient, useCreateClient, useTeam, useUpdateClient } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { getOrganizationRoleLabel } from "@/config/constants/dropdowns/users/organization-role-form.options";
import { Routes } from "@/routes/routes";
import type { ApiError } from "@/lib/api-error";
import { clientSchema, type ClientFormValues } from "../validation-schemas/client.schema";

const blank = (v?: string | null) => (v && v.trim() ? v.trim() : null);

/** Create or edit a client. Only first and last name are required. */
const ClientFormPage: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = !!id;
  const client = useClient(id);
  const team = useTeam();
  const { workspace, can } = useWorkspace();
  const create = useCreateClient();
  const update = useUpdateClient();
  const canAssign = can(Permissions.CLIENTS_ASSIGN_EMPLOYEES);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      company: "",
      email: "",
      phone: "",
      tax_id: "",
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
      address: blank(v.address),
      company_info: blank(v.company_info),
      ...(canAssign ? { assignee_member_ids: v.assignee_member_ids } : {}),
    };
    if (editing) {
      update.mutate({ id: id!, ...dto }, { onSuccess: () => navigate(Routes.clients.detail(id!)), onError });
    } else {
      create.mutate(
        { ...dto, internal_note: blank(v.internal_note), send_invitation: v.send_invitation },
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
            {label} {props.optional && <span className="soft font-normal">(optional)</span>}
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
        crumbs={[{ label: "Clients", to: Routes.clients.root }, ...(editing && client.data ? [{ label: `${client.data.first_name} ${client.data.last_name}`, to: Routes.clients.detail(id!) }] : []), { label: editing ? "Edit" : "New client" }]}
        title={editing ? "Edit client" : "Add client"}
        description="Only the first and last name are required. A client is a person with an optional company."
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <section className="card pad">
            <h3 className="mb-4">Contact</h3>
            <div className="form-grid">
              {field("first_name", "First name")}
              {field("last_name", "Last name")}
              {field("company", "Company", { optional: true, placeholder: "e.g. Northwind Logistics Ltd" })}
              {field("email", "Email", { type: "email", optional: true, placeholder: "Needed for the client portal and reminders" })}
              {field("phone", "Phone", { optional: true })}
              {field("tax_id", "Tax identification number", { optional: true })}
              {field("address", "Address", { optional: true, full: true })}
              {field("company_info", "Company information / notes", { optional: true, full: true, area: true })}
            </div>
          </section>

          <section className="card pad">
            <h3 className="mb-1">Assigned employees</h3>
            <p className="muted mb-4">Every selected employee can see and work with this client. Owners and Admins always have access.</p>
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
                            {m.is_you ? " (you)" : ""}
                          </span>
                          <span className="cell-sub">{getOrganizationRoleLabel(m.role)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              />
            ) : (
              <p className="muted">You are assigned to clients you create. Ask an Admin to add colleagues.</p>
            )}
          </section>

          {!editing && (
            <section className="card pad flex flex-col gap-4">
              {field("internal_note", "Internal note", { optional: true, area: true, placeholder: "Only visible to your team" })}
              <FormField
                control={form.control}
                name="send_invitation"
                render={({ field: f }) => (
                  <label className="flex items-center justify-between gap-4">
                    <span>
                      <span className="label block">Invite to the client portal now</span>
                      <span className="caption">
                        {workspace ? "The client can activate their portal from the email. " : ""}Otherwise they are invited when you assign their first form.
                      </span>
                    </span>
                    <Switch checked={f.value} onCheckedChange={f.onChange} disabled={!form.watch("email")} aria-label="Invite to the client portal now" />
                  </label>
                )}
              />
            </section>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(editing ? Routes.clients.detail(id!) : Routes.clients.root)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? "Save changes" : "Add client"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ClientFormPage;

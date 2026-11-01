import { z } from "zod";
import type { TFunction } from "i18next";

/** Built per render with the active `t` so validation messages follow the language. */
export const makeClientSchema = (t: TFunction) => {
  const optional = z.string().trim().max(2000).optional().or(z.literal(""));
  return z.object({
    first_name: z.string().trim().min(1, t("validation.firstNameRequired", { ns: "clients" })).max(80),
    last_name: z.string().trim().min(1, t("validation.lastNameRequired", { ns: "clients" })).max(80),
    company: optional,
    email: z.string().trim().min(1, t("validation.emailRequired", { ns: "clients" })).email(t("validation.invalidEmail", { ns: "clients" })),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    tax_id: z.string().trim().max(60).optional().or(z.literal("")),
    country: z.string().trim().max(2).optional().or(z.literal("")),
    address: z.string().trim().max(300).optional().or(z.literal("")),
    company_info: optional,
    internal_note: z.string().trim().max(5000).optional().or(z.literal("")),
    assignee_member_ids: z.array(z.string()),
    send_invitation: z.boolean(),
  });
};
export type ClientFormValues = z.infer<ReturnType<typeof makeClientSchema>>;

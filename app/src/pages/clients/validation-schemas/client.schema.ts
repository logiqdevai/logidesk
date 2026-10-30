import { z } from "zod";

const optional = z.string().trim().max(2000).optional().or(z.literal(""));

export const clientSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(80),
  last_name: z.string().trim().min(1, "Last name is required").max(80),
  company: optional,
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  tax_id: z.string().trim().max(60).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  company_info: optional,
  internal_note: z.string().trim().max(5000).optional().or(z.literal("")),
  assignee_member_ids: z.array(z.string()),
  send_invitation: z.boolean(),
});
export type ClientFormValues = z.infer<typeof clientSchema>;

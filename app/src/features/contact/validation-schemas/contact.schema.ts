import { z } from "zod";
import i18n from "@/i18n";
import { ContactTopics } from "../interfaces/contact.interfaces";

/** Lazy message: resolved when validation runs, so it follows the active language. */
const msg = (key: string) => ({ error: () => i18n.t(key) });

export const contactSchema = z.object({
  name: z.string().trim().min(1, msg("contact:validation.name")).max(120),
  email: z.string().trim().email(msg("contact:validation.email")),
  phone: z.string().trim().max(40),
  topic: z.enum(ContactTopics, msg("contact:validation.topic")),
  subject: z.string().trim().min(1, msg("contact:validation.subject")).max(150),
  message: z.string().trim().min(10, msg("contact:validation.message")).max(5000),
});
export type ContactFormData = z.infer<typeof contactSchema>;

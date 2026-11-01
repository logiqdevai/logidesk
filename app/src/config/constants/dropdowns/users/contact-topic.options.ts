import i18n from "@/i18n";
import { ContactTopics, type ContactTopic } from "@/features/contact/interfaces/contact.interfaces";

/** `label` resolves lazily so it follows the active language at render time. */
export const ContactTopicOptions: { id: ContactTopic; label: string }[] = ContactTopics.map((id) => ({
  id,
  get label() {
    return i18n.t(`topics.${id}`, { ns: "contact" });
  },
}));

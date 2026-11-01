export const ContactTopics = ["technical", "billing", "account", "feature", "other"] as const;
export type ContactTopic = (typeof ContactTopics)[number];

export interface ContactDto {
  name: string;
  email: string;
  phone?: string;
  topic: ContactTopic;
  subject: string;
  message: string;
}

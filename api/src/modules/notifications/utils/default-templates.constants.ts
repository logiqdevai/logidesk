import { AutomationTrigger, NotificationType } from 'generated/prisma';

export interface DefaultTemplate {
  type: NotificationType;
  name: string;
  subject: string;
  body: string;
}

/** Seeded for every new organization; editable in Settings > Notifications. */
export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    type: NotificationType.FORM_ASSIGNED,
    name: 'New form assignment',
    subject: '{{company_name}} needs a few documents from you',
    body:
      'Hi {{client_name}},\n\n{{company_name}} has asked you to complete "{{form_name}}"{{deadline_sentence}}.\n\n{{message}}\n\n' +
      'Documents requested:\n{{missing_documents}}\n\nYou can upload everything securely in your client portal:\n{{portal_link}}\n\nThank you.',
  },
  {
    type: NotificationType.MISSING_DOCUMENTS,
    name: 'Missing documents',
    subject: 'Reminder: documents still needed by {{company_name}}',
    body:
      'Hi {{client_name}},\n\nThis is a friendly reminder that we are still waiting for the following documents:\n{{missing_documents}}\n\n' +
      'Please upload them in your client portal:\n{{portal_link}}\n\nThank you.',
  },
  {
    type: NotificationType.EXPIRING_DOCUMENTS,
    name: 'Expiring documents',
    subject: 'A document will expire on {{expiration_date}}',
    body:
      'Hi {{client_name}},\n\nThe following document on file with {{company_name}} expires on {{expiration_date}}:\n{{missing_documents}}\n\n' +
      'Please upload a renewed version in your client portal:\n{{portal_link}}',
  },
  {
    type: NotificationType.EXPIRED_DOCUMENTS,
    name: 'Expired documents',
    subject: 'A document has expired',
    body:
      'Hi {{client_name}},\n\nThe following document on file with {{company_name}} expired on {{expiration_date}}:\n{{missing_documents}}\n\n' +
      'Please submit a replacement in your client portal:\n{{portal_link}}',
  },
  {
    type: NotificationType.DOCUMENT_REJECTED,
    name: 'Document rejection',
    subject: 'Please re-upload: {{document_name}}',
    body:
      'Hi {{client_name}},\n\nUnfortunately we could not accept "{{document_name}}" for "{{form_name}}".\n\nReason: {{rejection_reason}}\n\n' +
      'Please upload a new version in your client portal:\n{{portal_link}}',
  },
  {
    type: NotificationType.DOCUMENT_APPROVED,
    name: 'Document approval',
    subject: 'Approved: {{document_name}}',
    body: 'Hi {{client_name}},\n\nGood news — "{{document_name}}" for "{{form_name}}" has been approved by {{company_name}}.\n\n{{portal_link}}',
  },
  {
    type: NotificationType.CLIENT_INVITATION,
    name: 'Client portal invitation',
    subject: '{{company_name}} invited you to their client portal',
    body:
      'Hi {{client_name}},\n\n{{company_name}} uses Gatherly to collect documents securely. Activate your client portal here:\n{{portal_link}}\n\n' +
      'The link is personal and expires in {{invitation_validity_days}} days.',
  },
  {
    type: NotificationType.TEAM_INVITATION,
    name: 'Team invitation',
    subject: 'Join {{company_name}} on Gatherly',
    body:
      'Hi,\n\n{{inviter_name}} invited you to join {{company_name}} on Gatherly as {{role}}.\n\n{{message}}\n\nAccept the invitation:\n{{invitation_link}}',
  },
  {
    type: NotificationType.EMPLOYEE_ALERT,
    name: 'Employee alert',
    subject: '{{client_name}} uploaded {{document_name}}',
    body: '{{client_name}} uploaded "{{document_name}}" for "{{form_name}}".\n\nReview it in the Document Inbox:\n{{inbox_link}}',
  },
];

export interface DefaultAutomationRule {
  name: string;
  trigger: AutomationTrigger;
  offsets_days?: number[];
  repeat_enabled?: boolean;
  repeat_interval_count?: number;
  repeat_interval_unit?: 'DAYS' | 'WEEKS';
  max_sends?: number;
}

export const DEFAULT_AUTOMATION_RULES: DefaultAutomationRule[] = [
  { name: 'Notify on new assignment', trigger: AutomationTrigger.FORM_ASSIGNED },
  { name: 'Missing documents reminders', trigger: AutomationTrigger.MISSING_DOCUMENTS },
  { name: 'Expiring documents', trigger: AutomationTrigger.DOCUMENT_EXPIRING, offsets_days: [30, 7, 0] },
  {
    name: 'Expired documents',
    trigger: AutomationTrigger.DOCUMENT_EXPIRED,
    repeat_enabled: true,
    repeat_interval_count: 1,
    repeat_interval_unit: 'WEEKS',
    max_sends: 4,
  },
  { name: 'Document rejected', trigger: AutomationTrigger.DOCUMENT_REJECTED },
  { name: 'Document approved', trigger: AutomationTrigger.DOCUMENT_APPROVED },
];

export const TEMPLATE_VARIABLES = [
  'client_name',
  'company_name',
  'form_name',
  'missing_documents',
  'expiration_date',
  'portal_link',
  'document_name',
  'rejection_reason',
  'deadline',
];

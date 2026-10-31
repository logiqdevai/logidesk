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
      'Hi {{client_name}},\n\n{{company_name}} uses LogiDesk to collect documents securely. Activate your client portal here:\n{{portal_link}}\n\n' +
      'The link is personal and expires in {{invitation_validity_days}} days.',
  },
  {
    type: NotificationType.TEAM_INVITATION,
    name: 'Team invitation',
    subject: 'Join {{company_name}} on LogiDesk',
    body:
      'Hi,\n\n{{inviter_name}} invited you to join {{company_name}} on LogiDesk as {{role}}.\n\n{{message}}\n\nAccept the invitation:\n{{invitation_link}}',
  },
  {
    type: NotificationType.EMPLOYEE_ALERT,
    name: 'Employee alert',
    subject: '{{client_name}} uploaded {{document_name}}',
    body: '{{client_name}} uploaded "{{document_name}}" for "{{form_name}}".\n\nReview it in the Document Inbox:\n{{inbox_link}}',
  },
];

/** Greek defaults; `{{placeholders}}` are identical to the English set. */
export const DEFAULT_TEMPLATES_EL: DefaultTemplate[] = [
  {
    type: NotificationType.FORM_ASSIGNED,
    name: 'Νέα ανάθεση φόρμας',
    subject: 'Η {{company_name}} χρειάζεται μερικά έγγραφα από εσάς',
    body:
      'Αγαπητέ/ή {{client_name}},\n\nΗ {{company_name}} σας ζήτησε να συμπληρώσετε τη φόρμα "{{form_name}}"{{deadline_sentence}}.\n\n{{message}}\n\n' +
      'Έγγραφα που απαιτούνται:\n{{missing_documents}}\n\nΜπορείτε να ανεβάσετε τα πάντα με ασφάλεια στην πύλη πελάτη σας:\n{{portal_link}}\n\nΣας ευχαριστούμε.',
  },
  {
    type: NotificationType.MISSING_DOCUMENTS,
    name: 'Έγγραφα που λείπουν',
    subject: 'Υπενθύμιση: η {{company_name}} εξακολουθεί να χρειάζεται έγγραφα',
    body:
      'Αγαπητέ/ή {{client_name}},\n\nΣας υπενθυμίζουμε ευγενικά ότι αναμένουμε ακόμη τα παρακάτω έγγραφα:\n{{missing_documents}}\n\n' +
      'Παρακαλούμε ανεβάστε τα στην πύλη πελάτη σας:\n{{portal_link}}\n\nΣας ευχαριστούμε.',
  },
  {
    type: NotificationType.EXPIRING_DOCUMENTS,
    name: 'Έγγραφα που λήγουν',
    subject: 'Ένα έγγραφο λήγει στις {{expiration_date}}',
    body:
      'Αγαπητέ/ή {{client_name}},\n\nΤο παρακάτω έγγραφο που τηρείται στην {{company_name}} λήγει στις {{expiration_date}}:\n{{missing_documents}}\n\n' +
      'Παρακαλούμε ανεβάστε μια ανανεωμένη έκδοση στην πύλη πελάτη σας:\n{{portal_link}}',
  },
  {
    type: NotificationType.EXPIRED_DOCUMENTS,
    name: 'Έγγραφα που έχουν λήξει',
    subject: 'Ένα έγγραφο έχει λήξει',
    body:
      'Αγαπητέ/ή {{client_name}},\n\nΤο παρακάτω έγγραφο που τηρείται στην {{company_name}} έληξε στις {{expiration_date}}:\n{{missing_documents}}\n\n' +
      'Παρακαλούμε υποβάλετε αντικατάστασή του στην πύλη πελάτη σας:\n{{portal_link}}',
  },
  {
    type: NotificationType.DOCUMENT_REJECTED,
    name: 'Απόρριψη εγγράφου',
    subject: 'Παρακαλούμε ανεβάστε ξανά: {{document_name}}',
    body:
      'Αγαπητέ/ή {{client_name}},\n\nΔυστυχώς δεν μπορέσαμε να αποδεχτούμε το έγγραφο "{{document_name}}" για τη φόρμα "{{form_name}}".\n\nΛόγος: {{rejection_reason}}\n\n' +
      'Παρακαλούμε ανεβάστε μια νέα έκδοση στην πύλη πελάτη σας:\n{{portal_link}}',
  },
  {
    type: NotificationType.DOCUMENT_APPROVED,
    name: 'Έγκριση εγγράφου',
    subject: 'Εγκρίθηκε: {{document_name}}',
    body: 'Αγαπητέ/ή {{client_name}},\n\nΚαλά νέα — το έγγραφο "{{document_name}}" για τη φόρμα "{{form_name}}" εγκρίθηκε από την {{company_name}}.\n\n{{portal_link}}',
  },
  {
    type: NotificationType.CLIENT_INVITATION,
    name: 'Πρόσκληση στην πύλη πελάτη',
    subject: 'Η {{company_name}} σας προσκάλεσε στην πύλη πελατών της',
    body:
      'Αγαπητέ/ή {{client_name}},\n\nΗ {{company_name}} χρησιμοποιεί το LogiDesk για την ασφαλή συλλογή εγγράφων. Ενεργοποιήστε την πύλη πελάτη σας εδώ:\n{{portal_link}}\n\n' +
      'Ο σύνδεσμος είναι προσωπικός και λήγει σε {{invitation_validity_days}} ημέρες.',
  },
  {
    type: NotificationType.TEAM_INVITATION,
    name: 'Πρόσκληση ομάδας',
    subject: 'Γίνετε μέλος της {{company_name}} στο LogiDesk',
    body:
      'Γεια σας,\n\nΟ/Η {{inviter_name}} σας προσκάλεσε να γίνετε μέλος της {{company_name}} στο LogiDesk με ρόλο {{role}}.\n\n{{message}}\n\nΑποδεχτείτε την πρόσκληση:\n{{invitation_link}}',
  },
  {
    type: NotificationType.EMPLOYEE_ALERT,
    name: 'Ειδοποίηση υπαλλήλου',
    subject: 'Ο/Η {{client_name}} ανέβασε το έγγραφο {{document_name}}',
    body: 'Ο/Η {{client_name}} ανέβασε το έγγραφο "{{document_name}}" για τη φόρμα "{{form_name}}".\n\nΕλέγξτε το στα Εισερχόμενα Εγγράφων:\n{{inbox_link}}',
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

export const DEFAULT_AUTOMATION_RULES_EL: DefaultAutomationRule[] = [
  { ...DEFAULT_AUTOMATION_RULES[0], name: 'Ειδοποίηση για νέα ανάθεση' },
  { ...DEFAULT_AUTOMATION_RULES[1], name: 'Υπενθυμίσεις για έγγραφα που λείπουν' },
  { ...DEFAULT_AUTOMATION_RULES[2], name: 'Έγγραφα που λήγουν' },
  { ...DEFAULT_AUTOMATION_RULES[3], name: 'Έγγραφα που έχουν λήξει' },
  { ...DEFAULT_AUTOMATION_RULES[4], name: 'Απόρριψη εγγράφου' },
  { ...DEFAULT_AUTOMATION_RULES[5], name: 'Έγκριση εγγράφου' },
];

/** Default templates and automation rules in the given language (`el` or English). */
export function getDefaultTemplates(language?: string | null) {
  return language === 'el'
    ? { templates: DEFAULT_TEMPLATES_EL, automationRules: DEFAULT_AUTOMATION_RULES_EL }
    : { templates: DEFAULT_TEMPLATES, automationRules: DEFAULT_AUTOMATION_RULES };
}

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

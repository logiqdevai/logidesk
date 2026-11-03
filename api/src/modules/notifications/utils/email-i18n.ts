import { OrganizationRole, RequirementStatus } from 'generated/prisma';
import { AppLanguage } from '@/shared/i18n/language.utils';

/** Small pieces of text that get injected into email templates as `{{variables}}`, per language. */
interface EmailStrings {
  completeFormQuestions: string;
  deadlineSentence: (formattedDeadline: string) => string;
  /** List entry for the unanswered questions of a form in reminder emails. */
  formQuestions: (formName: string) => string;
  /** Per-item suffix in reminder lists. */
  dueBy: (formattedDeadline: string) => string;
  overdueSince: (formattedDeadline: string) => string;
  /** Paragraph injected as `{{deadline_notice}}` (ends with a blank line so templates can place it before the next one). */
  deadlineUpcoming: (formattedDeadline: string) => string;
  deadlinePassed: (formattedDeadline: string) => string;
  requirementStatus: Partial<Record<RequirementStatus, string>>;
  role: Record<OrganizationRole, string>;
  buttonLabel: string;
  footer: string;
}

const STRINGS: Record<AppLanguage, EmailStrings> = {
  en: {
    completeFormQuestions: '• Please complete the form questions',
    deadlineSentence: (d) => ` by ${d}`,
    formQuestions: (f) => `Questions in "${f}"`,
    dueBy: (d) => `due ${d}`,
    overdueSince: (d) => `overdue since ${d}`,
    deadlineUpcoming: (d) => `Please submit everything by ${d}.\n\n`,
    deadlinePassed: (d) => `The submission deadline was ${d}. Please submit everything as soon as possible.\n\n`,
    requirementStatus: {
      MISSING: 'missing',
      REJECTED: 'rejected — please re-upload',
      EXPIRED: 'expired — please upload a replacement',
    },
    role: { OWNER: 'an Owner', ADMIN: 'an Admin', MEMBER: 'a Member' },
    buttonLabel: 'Open secure link',
    footer: 'Sent securely.',
  },
  el: {
    completeFormQuestions: '• Παρακαλούμε συμπληρώστε τις ερωτήσεις της φόρμας',
    deadlineSentence: (d) => ` έως ${d}`,
    formQuestions: (f) => `Ερωτήσεις της φόρμας "${f}"`,
    dueBy: (d) => `προθεσμία ${d}`,
    overdueSince: (d) => `εκπρόθεσμο από ${d}`,
    deadlineUpcoming: (d) => `Παρακαλούμε υποβάλετε τα πάντα έως ${d}.\n\n`,
    deadlinePassed: (d) => `Η προθεσμία υποβολής ήταν ${d}. Παρακαλούμε υποβάλετε τα πάντα το συντομότερο δυνατό.\n\n`,
    requirementStatus: {
      MISSING: 'λείπει',
      REJECTED: 'απορρίφθηκε — παρακαλούμε ανεβάστε το ξανά',
      EXPIRED: 'έχει λήξει — παρακαλούμε ανεβάστε αντικατάστασή του',
    },
    role: { OWNER: 'Ιδιοκτήτης', ADMIN: 'Διαχειριστής', MEMBER: 'Μέλος' },
    buttonLabel: 'Άνοιγμα ασφαλούς συνδέσμου',
    footer: 'Εστάλη με ασφάλεια.',
  },
};

export function emailStrings(language?: string | null): EmailStrings {
  return STRINGS[language === 'el' ? 'el' : 'en'];
}

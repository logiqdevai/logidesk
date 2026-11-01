import { OrganizationRole, RequirementStatus } from 'generated/prisma';
import { AppLanguage } from '@/shared/i18n/language.utils';

/** Small pieces of text that get injected into email templates as `{{variables}}`, per language. */
interface EmailStrings {
  completeFormQuestions: string;
  deadlineSentence: (formattedDeadline: string) => string;
  requirementStatus: Partial<Record<RequirementStatus, string>>;
  role: Record<OrganizationRole, string>;
  buttonLabel: string;
  footer: string;
}

const STRINGS: Record<AppLanguage, EmailStrings> = {
  en: {
    completeFormQuestions: '• Please complete the form questions',
    deadlineSentence: (d) => ` by ${d}`,
    requirementStatus: {
      MISSING: 'missing',
      REJECTED: 'rejected — please re-upload',
      EXPIRED: 'expired — please upload a replacement',
    },
    role: { OWNER: 'an Owner', ADMIN: 'an Admin', MEMBER: 'a Member' },
    buttonLabel: 'Open secure link',
    footer: 'Sent securely with LogiDesk.',
  },
  el: {
    completeFormQuestions: '• Παρακαλούμε συμπληρώστε τις ερωτήσεις της φόρμας',
    deadlineSentence: (d) => ` έως ${d}`,
    requirementStatus: {
      MISSING: 'λείπει',
      REJECTED: 'απορρίφθηκε — παρακαλούμε ανεβάστε το ξανά',
      EXPIRED: 'έχει λήξει — παρακαλούμε ανεβάστε αντικατάστασή του',
    },
    role: { OWNER: 'Ιδιοκτήτης', ADMIN: 'Διαχειριστής', MEMBER: 'Μέλος' },
    buttonLabel: 'Άνοιγμα ασφαλούς συνδέσμου',
    footer: 'Εστάλη με ασφάλεια μέσω LogiDesk.',
  },
};

export function emailStrings(language?: string | null): EmailStrings {
  return STRINGS[language === 'el' ? 'el' : 'en'];
}

import { EmailTemplates } from '@/integrations/notifications/resend/interfaces/mail.interfaces';

const EmailAddress = "info@appointmy.com"

export const EmailConfig = {
    /** Sender used when EMAIL_FROM is not set. Must be on a domain verified in Resend. */
    default_from: 'info@logiqdev.com',
    email_addresses: {
        verification: EmailAddress,
        confirmation: EmailAddress,
    },
    templates: {
        waitlist: {
            subject: 'Waitlist',
            template_id: EmailTemplates.WAITLIST,
        },
    }
}

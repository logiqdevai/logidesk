import { APP_NAME } from '@/shared/constants/app';

export type InvitationLanguage = 'en' | 'el';

const COPY: Record<InvitationLanguage, {
  subject: string;
  eyebrow: string;
  headline: string;
  body: string;
  button: string;
  expiry: string;
  fallback: string;
  footer: string;
}> = {
  en: {
    subject: `Congratulations — you're invited to ${APP_NAME}`,
    eyebrow: "You're invited",
    headline: `Congratulations, you've been invited to ${APP_NAME}`,
    body: `You have been selected to create an account on ${APP_NAME}, the calm, organised way to collect documents from your clients. Your place is reserved. Setting up your account takes less than a minute.`,
    button: 'Create my account',
    expiry: 'This invitation is personal to you and expires in 7 days.',
    fallback: 'Button not working? Copy and paste this link into your browser:',
    footer: 'If you were not expecting this invitation, you can safely ignore this email.',
  },
  el: {
    subject: `Συγχαρητήρια — έχετε προσκληθεί στο ${APP_NAME}`,
    eyebrow: 'Πρόσκληση',
    headline: `Συγχαρητήρια, έχετε προσκληθεί στο ${APP_NAME}`,
    body: `Επιλεγήκατε να δημιουργήσετε λογαριασμό στο ${APP_NAME}, τον απλό και οργανωμένο τρόπο για να συλλέγετε έγγραφα από τους πελάτες σας. Η θέση σας είναι δεσμευμένη. Η ρύθμιση του λογαριασμού σας διαρκεί λιγότερο από ένα λεπτό.`,
    button: 'Δημιουργία λογαριασμού',
    expiry: 'Η πρόσκληση είναι προσωπική και λήγει σε 7 ημέρες.',
    fallback: 'Δεν λειτουργεί το κουμπί; Αντιγράψτε αυτόν τον σύνδεσμο στον περιηγητή σας:',
    footer: 'Αν δεν περιμένατε αυτή την πρόσκληση, μπορείτε να αγνοήσετε με ασφάλεια αυτό το email.',
  },
};

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Admin-sent platform invitation: premium, brand-level email with no sender name. */
export function renderPlatformInvitationEmail(options: { language: InvitationLanguage; link: string; message?: string | null }) {
  const c = COPY[options.language] ?? COPY.el;
  const accent = '#cc785c';
  const message = options.message?.trim();
  const link = esc(options.link);

  const text = [
    c.headline,
    c.body,
    message ? `“${message}”` : null,
    `${c.button}:\n${options.link}`,
    c.expiry,
    c.footer,
  ]
    .filter(Boolean)
    .join('\n\n');

  const html = `<!doctype html><html lang="${options.language}"><body style="margin:0;padding:0;background:#faf9f5;font-family:Inter,'Segoe UI',Arial,sans-serif;color:#3d3d3a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.headline)}</div>
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
<div style="text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:.2px;color:#141413;margin-bottom:28px">${esc(APP_NAME)}</div>
<div style="background:#ffffff;border:1px solid #e6dfd8;border-radius:16px;overflow:hidden">
<div style="height:4px;background:${accent}"></div>
<div style="padding:40px 36px 36px;text-align:center">
<div style="font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${accent};margin-bottom:14px">${esc(c.eyebrow)}</div>
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:28px;line-height:1.25;color:#141413">${esc(c.headline)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#55534e">${esc(c.body)}</p>
${message ? `<div style="margin:0 0 28px;padding:14px 18px;border-left:3px solid ${accent};background:#faf9f5;border-radius:0 8px 8px 0;text-align:left;font-size:14px;line-height:1.6;font-style:italic;color:#3d3d3a">${esc(message).replace(/\n/g, '<br>')}</div>` : ''}
<a href="${link}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px">${esc(c.button)}</a>
<p style="margin:24px 0 0;font-size:13px;color:#8e8b82">${esc(c.expiry)}</p>
</div>
</div>
<p style="margin:22px 8px 6px;font-size:12px;line-height:1.6;color:#8e8b82;text-align:center">${esc(c.fallback)}<br><a href="${link}" style="color:${accent};word-break:break-all">${link}</a></p>
<p style="margin:14px 8px 0;font-size:12px;line-height:1.6;color:#a8a59c;text-align:center">${esc(c.footer)}</p>
</div></body></html>`;

  return { subject: c.subject, text, html };
}

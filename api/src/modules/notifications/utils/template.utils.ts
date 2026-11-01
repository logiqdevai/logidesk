import { emailStrings } from './email-i18n';

/** Replaces {{variable}} placeholders. Unknown variables render as an empty string. */
export function renderTemplate(template: string, variables: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? '' : String(value);
  }).replace(/\n{3,}/g, '\n\n');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * The message text is already localized, so whichever script dominates tells us the language
 * (URLs and `{{placeholders}}` are ignored, so a Greek name in an English email does not flip it).
 */
export function detectLanguage(text: string): 'en' | 'el' {
  const words = text.replace(/https?:\/\/\S+/g, '').replace(/\{\{[^}]*\}\}/g, '');
  const greek = (words.match(/[Ͱ-Ͽἀ-῿]/g) ?? []).length;
  const latin = (words.match(/[A-Za-z]/g) ?? []).length;
  return greek > latin ? 'el' : 'en';
}

/** Plain-text message → simple, accessible HTML email (links become buttons/anchors). */
export function textToHtml(text: string, options: { organizationName: string; accentColor?: string | null; language?: 'en' | 'el' }): string {
  const { buttonLabel, footer } = emailStrings(options.language ?? detectLanguage(text));
  const accent = options.accentColor && /^#[0-9a-f]{3,8}$/i.test(options.accentColor) ? options.accentColor : '#cc785c';
  const paragraphs = escapeHtml(text)
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (/^https?:\/\/\S+$/.test(trimmed) || trimmed === '__SECURE_LINK__') {
        return `<p style="margin:20px 0"><a href="${trimmed}" style="background:${accent};color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${buttonLabel}</a></p>`;
      }
      // A paragraph that ends with a link ("... activate here: https://...") keeps its text and shows the link as a button.
      const trailing = trimmed.match(/^([\s\S]*?)\s+(https?:\/\/\S+)$/);
      if (trailing) {
        const lead = trailing[1].replace(/\n/g, '<br>');
        return `<p style="margin:0 0 14px">${lead}</p><p style="margin:20px 0"><a href="${trailing[2]}" style="background:${accent};color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${buttonLabel}</a></p>`;
      }
      const html = block
        .replace(/(https?:\/\/[^\s<]+)/g, `<a href="$1" style="color:${accent}">$1</a>`)
        .replace(/\n/g, '<br>');
      return `<p style="margin:0 0 14px">${html}</p>`;
    })
    .join('');
  return `<!doctype html><html><body style="margin:0;background:#faf9f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#3d3d3a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<div style="font-family:Georgia,serif;font-size:22px;color:#141413;margin-bottom:24px">${escapeHtml(options.organizationName)}</div>
<div style="background:#ffffff;border:1px solid #e6dfd8;border-radius:12px;padding:24px;font-size:14px;line-height:1.6">${paragraphs}</div>
<div style="font-size:12px;color:#8e8b82;margin-top:16px">${footer}</div>
</div></body></html>`;
}

/** Bulleted list of document names for {{missing_documents}}. */
export function documentList(items: Array<{ name: string; detail?: string }>): string {
  if (!items.length) return '';
  return items.map((i) => `• ${i.name}${i.detail ? ` (${i.detail})` : ''}`).join('\n');
}

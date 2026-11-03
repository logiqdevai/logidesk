import { instantToZoned, zonedToInstant } from "@/lib/format";
import type { FormDeadlineDefaults } from "@/features/forms/interfaces/forms.interfaces";

export const DEFAULT_FORM_DEADLINE_TIME = "23:59";

/**
 * The deadline a form suggests when it is assigned now, as an ISO instant ("" when it has none).
 * Mirrors the API's `formDefaultDeadline`: N days after today (in the organization zone) or a fixed
 * date, at the form's deadline time.
 */
export function formDefaultDeadline(form: FormDeadlineDefaults, timeZone: string, now: Date = new Date()): string {
  const time = form.default_deadline_time ?? DEFAULT_FORM_DEADLINE_TIME;
  if (form.default_deadline_policy === "AFTER_ASSIGNMENT" && form.default_deadline_days) {
    const day = new Date(`${instantToZoned(now, timeZone).date}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + form.default_deadline_days);
    return zonedToInstant(day.toISOString().slice(0, 10), time, timeZone);
  }
  if (form.default_deadline_policy === "FIXED_DATE" && form.default_deadline_date) {
    return zonedToInstant(form.default_deadline_date, time, timeZone);
  }
  return "";
}

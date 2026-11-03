import { DateTime } from 'luxon';
import { DeadlinePolicy } from 'generated/prisma';
import { safeZone } from '@/shared/utils/dates/dates.utils';

export const DEFAULT_FORM_DEADLINE_TIME = '23:59';

export interface FormDeadlineDefaults {
  default_deadline_policy: DeadlinePolicy;
  default_deadline_days: number | null;
  default_deadline_date: Date | null;
  default_deadline_time: string | null;
}

/**
 * The submission deadline a form version suggests for an assignment created at `assignedAt`:
 * N days later (AFTER_ASSIGNMENT) or a fixed calendar date (FIXED_DATE), at the configured time
 * of day in the organization time zone. Null when the form has no default deadline.
 */
export function formDefaultDeadline(version: FormDeadlineDefaults, assignedAt: Date, timeZone: string): Date | null {
  const zone = safeZone(timeZone);
  const [hour, minute] = (version.default_deadline_time ?? DEFAULT_FORM_DEADLINE_TIME).split(':').map(Number);
  let day: DateTime | null = null;
  if (version.default_deadline_policy === DeadlinePolicy.AFTER_ASSIGNMENT && version.default_deadline_days) {
    day = DateTime.fromJSDate(assignedAt).setZone(zone).plus({ days: version.default_deadline_days });
  } else if (version.default_deadline_policy === DeadlinePolicy.FIXED_DATE && version.default_deadline_date) {
    // `@db.Date` values are UTC midnight; read the calendar date in UTC, then place it in the org zone.
    day = DateTime.fromISO(DateTime.fromJSDate(version.default_deadline_date, { zone: 'utc' }).toISODate(), { zone });
  }
  if (!day?.isValid) return null;
  return day.set({ hour, minute, second: 0, millisecond: 0 }).toUTC().toJSDate();
}

/** Earliest of several deadlines (null when none is set). */
export function earliestDeadline(deadlines: Array<Date | null | undefined>): Date | null {
  return deadlines.reduce<Date | null>((min, d) => (d && (!min || d.getTime() < min.getTime()) ? d : min), null);
}

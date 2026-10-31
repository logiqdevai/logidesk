import { DateTime } from 'luxon';

/** Time zone assumed when an organization has none (or an invalid one). */
export const DEFAULT_TIME_ZONE = 'Europe/Athens';

/** Calendar date ("yyyy-MM-dd") in the given IANA time zone. */
export function localDateString(timeZone: string, at: Date = new Date()): string {
  return DateTime.fromJSDate(at).setZone(safeZone(timeZone)).toISODate();
}

/** Converts a "yyyy-MM-dd" string into the Date Prisma stores in a `@db.Date` column (UTC midnight). */
export function dateOnly(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const iso = value.slice(0, 10);
  const parsed = DateTime.fromISO(iso, { zone: 'utc' });
  return parsed.isValid ? parsed.toJSDate() : null;
}

/** "yyyy-MM-dd" of a `@db.Date` value. */
export function toIsoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** ISO instant ("2026-12-01T13:00:00.000Z") of a deadline timestamp. */
export function toIsoDateTime(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/**
 * Parses a deadline from the API. A full ISO datetime is taken as given; a bare "yyyy-MM-dd"
 * means the end of that day in the organization's time zone.
 */
export function parseDeadline(value: string | null | undefined, timeZone: string): Date | null {
  if (!value) return null;
  const zone = safeZone(timeZone);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? DateTime.fromISO(value, { zone }).endOf('day') : DateTime.fromISO(value, { setZone: true });
  return parsed.isValid ? parsed.toUTC().toJSDate() : null;
}

/** Calendar date of an instant in a time zone, as the UTC-midnight Date used for day math. */
export function localDateOf(value: Date | null | undefined, timeZone: string): Date | null {
  return value ? dateOnly(DateTime.fromJSDate(value).setZone(safeZone(timeZone)).toISODate()) : null;
}

/** "27 Oct 2026, 16:42" style text for emails, in the given time zone. */
export function formatDeadline(value: Date, timeZone: string): string {
  return DateTime.fromJSDate(value).setZone(safeZone(timeZone)).toFormat('dd LLL yyyy, HH:mm');
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Whole days from `a` to `b` (both date-only values). */
export function diffDays(a: Date, b: Date): number {
  return Math.round((dateOnly(b).getTime() - dateOnly(a).getTime()) / 86_400_000);
}

export function safeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return DEFAULT_TIME_ZONE;
  return DateTime.local().setZone(timeZone).isValid ? timeZone : DEFAULT_TIME_ZONE;
}

/** Minutes since local midnight for an "HH:mm" string. */
export function minutesOfDay(hhmm: string | null | undefined): number | null {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** UTC instant of a local date + "HH:mm" in a time zone. */
export function zonedInstant(isoDate: string, hhmm: string, timeZone: string): Date {
  return DateTime.fromISO(`${isoDate}T${hhmm}`, { zone: safeZone(timeZone) }).toUTC().toJSDate();
}

/**
 * Moves a send time out of quiet hours (sent at the end of them). Handles windows that
 * cross midnight, e.g. 21:00–08:00.
 */
export function applyQuietHours(sendTime: string, quietStart?: string | null, quietEnd?: string | null): string {
  const t = minutesOfDay(sendTime);
  const s = minutesOfDay(quietStart);
  const e = minutesOfDay(quietEnd);
  if (t === null || s === null || e === null || s === e) return sendTime;
  const inside = s < e ? t >= s && t < e : t >= s || t < e;
  return inside ? quietEnd : sendTime;
}

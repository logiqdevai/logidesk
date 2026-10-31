import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from "date-fns";
import i18n from "@/i18n";
import { dateLocale } from "@/i18n/locale";

const toDate = (value: string | Date) => (typeof value === "string" ? (value.length === 10 ? parseISO(value) : new Date(value)) : value);

/** 27 Oct 2026 */
export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  return format(toDate(value), "dd MMM yyyy", { locale: dateLocale() });
}

/** 27 Oct 2026, 16:42 */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  return format(toDate(value), "dd MMM yyyy, HH:mm", { locale: dateLocale() });
}

/** Time zone used when an organization has none configured. */
export const DEFAULT_TIME_ZONE = "Europe/Athens";

const zoneParts = (instant: number, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
};

/** Wall-clock `yyyy-MM-dd` and `HH:mm` of an instant in a time zone. */
export function instantToZoned(value: string | Date, timeZone: string = DEFAULT_TIME_ZONE): { date: string; time: string } {
  const p = zoneParts(new Date(value).getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

/** UTC instant (ISO) of a wall-clock `yyyy-MM-dd` + `HH:mm` in a time zone. */
export function zonedToInstant(date: string, time: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  const asUtc = Date.parse(`${date}T${time}:00Z`);
  const offset = (t: number) => {
    const p = zoneParts(t, timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
  };
  let guess = asUtc - offset(asUtc);
  guess = asUtc - offset(guess);
  return new Date(guess).toISOString();
}

/** 27 Oct 2026, 16:42 — a deadline instant shown in the organization's time zone (browser zone when none given). */
export function formatDeadline(value?: string | null, timeZone?: string): string {
  if (!value) return "—";
  if (value.length === 10) return formatDate(value);
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const p = zoneParts(new Date(value).getTime(), zone);
  return format(new Date(p.year, p.month - 1, p.day, p.hour, p.minute), "dd MMM yyyy, HH:mm", { locale: dateLocale() });
}

/** Today, 09:12 · Yesterday · 23 Oct 2026 */
export function formatRelative(value?: string | Date | null): string {
  if (!value) return "—";
  const d = toDate(value);
  if (isToday(d)) return i18n.t("date.todayAt", { ns: "common", time: format(d, "HH:mm") });
  if (isYesterday(d)) return i18n.t("date.yesterdayAt", { ns: "common", time: format(d, "HH:mm") });
  return format(d, "dd MMM yyyy", { locale: dateLocale() });
}

export function timeAgo(value?: string | Date | null): string {
  if (!value) return "—";
  return i18n.t("date.ago", { ns: "common", distance: formatDistanceToNowStrict(toDate(value), { locale: dateLocale() }) });
}

/** Whole days from today until a date (negative when in the past). */
export function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  return differenceInCalendarDays(toDate(value), new Date());
}

export function longToday(): string {
  return format(new Date(), "EEEE, d MMMM yyyy", { locale: dateLocale() });
}

export function greeting(): string {
  const h = new Date().getHours();
  return i18n.t(h < 12 ? "greeting.morning" : h < 18 ? "greeting.afternoon" : "greeting.evening", { ns: "common" });
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function fullName(p?: { first_name?: string | null; last_name?: string | null } | null): string {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

/** Deterministic avatar tint (c1..c4) from a string. */
export function avatarTone(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return `c${(Math.abs(h) % 4) + 1}`;
}

export function pluralize(count: number, word: string, plural = `${word}s`): string {
  return `${count} ${count === 1 ? word : plural}`;
}

/** Triggers a browser download of text content (CSV exports are built server side). */
export function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

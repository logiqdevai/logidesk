import { DateTime } from 'luxon';
import { RecurrenceDeadlineMode, RecurrenceEndMode, RecurrenceFrequency } from 'generated/prisma';
import { safeZone } from '@/shared/utils/dates/dates.utils';

/**
 * Pure scheduling maths for recurring form assignments. Everything is evaluated in the series' own
 * IANA time zone (so DST never shifts a run) and returned as UTC instants.
 */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval_count: number;
  /** ISO weekday (1 = Monday … 7 = Sunday); weekly only. */
  weekday: number | null;
  day_of_month: number | null;
  last_day_of_month: boolean;
  /** Quarterly / semi-annual: first month of the cycle. Yearly: the month. */
  month_of_year: number | null;
  /** "HH:mm" local time the occurrence is created at. */
  run_time: string;
  time_zone: string;
  /** "yyyy-MM-dd" — first day an occurrence may happen. */
  starts_on: string;
  end_mode: RecurrenceEndMode;
  end_count: number | null;
  /** "yyyy-MM-dd" — last day an occurrence may happen. */
  end_date: string | null;
  deadline_mode: RecurrenceDeadlineMode;
  deadline_offset_days: number | null;
  deadline_time: string | null;
  deadline_day: number | null;
  deadline_last_day: boolean;
}

export interface RecurrenceOccurrence {
  run_at: Date;
  deadline_at: Date | null;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_DEADLINE_TIME = '23:59';

/** Months between two occurrences for the month-based frequencies (monthly is multiplied by `interval_count`). */
const CYCLE_MONTHS: Record<Exclude<RecurrenceFrequency, 'WEEKLY'>, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  YEARLY: 12,
};

/** Highest first-month value per frequency (quarterly 1..3, semi-annual 1..6, yearly 1..12). */
const MAX_START_MONTH: Partial<Record<RecurrenceFrequency, number>> = { QUARTERLY: 3, SEMI_ANNUAL: 6, YEARLY: 12 };

const atTime = (day: DateTime, hhmm: string): DateTime => {
  const [hour, minute] = hhmm.split(':').map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
};

const clampDay = (first: DateTime, day: number | null, last: boolean): DateTime => first.set({ day: last ? first.daysInMonth : Math.min(day ?? 1, first.daysInMonth) });

/** Last millisecond of the local day containing `at`. */
export function endOfLocalDay(at: Date, timeZone: string): Date {
  return DateTime.fromJSDate(at).setZone(safeZone(timeZone)).endOf('day').toJSDate();
}

/** First occurrence strictly after `after` (and not before `starts_on`), ignoring the end condition. */
export function nextOccurrence(rule: RecurrenceRule, after: Date): Date | null {
  const zone = safeZone(rule.time_zone);
  const startsOn = DateTime.fromISO(rule.starts_on, { zone }).startOf('day');
  if (!startsOn.isValid) return null;
  const afterDay = DateTime.fromJSDate(after).setZone(zone).startOf('day');
  const from = afterDay > startsOn ? afterDay : startsOn;

  if (rule.frequency === RecurrenceFrequency.WEEKLY) {
    const every = Math.max(1, rule.interval_count);
    // Week 0 is the week of the first matching weekday on/after the start date.
    const anchor = startsOn.plus({ days: (((rule.weekday ?? 1) - startsOn.weekday) + 7) % 7 }).startOf('week');
    for (let i = 0; i < 7 * every + 8; i++) {
      const day = from.plus({ days: i });
      if (day.weekday !== rule.weekday) continue;
      if (Math.round(day.startOf('week').diff(anchor, 'weeks').weeks) % every !== 0) continue;
      const at = atTime(day, rule.run_time);
      if (at.toMillis() > after.getTime()) return at.toUTC().toJSDate();
    }
    return null;
  }

  const step = CYCLE_MONTHS[rule.frequency] * (rule.frequency === RecurrenceFrequency.MONTHLY ? Math.max(1, rule.interval_count) : 1);
  let anchorIdx = startsOn.year * 12 + ((rule.month_of_year ?? 1) - 1);
  if (rule.frequency === RecurrenceFrequency.MONTHLY) {
    // Cycle 0 is the first month whose run day is on/after the start date.
    const startMonth = clampDay(startsOn.startOf('month'), rule.day_of_month, rule.last_day_of_month);
    anchorIdx = startsOn.year * 12 + (startsOn.month - 1) + (startMonth < startsOn ? 1 : 0);
  }
  let idx = from.year * 12 + (from.month - 1);
  for (let k = 0; k < step + 14; k++, idx++) {
    if ((((idx - anchorIdx) % step) + step) % step !== 0) continue;
    const first = DateTime.fromObject({ year: Math.floor(idx / 12), month: (idx % 12) + 1, day: 1 }, { zone });
    const day = clampDay(first, rule.day_of_month, rule.last_day_of_month);
    if (day < startsOn) continue;
    const at = atTime(day, rule.run_time);
    if (at.toMillis() > after.getTime()) return at.toUTC().toJSDate();
  }
  return null;
}

/** Next occurrence after `after` that is still allowed by the end condition; `created` = occurrences already generated. */
export function nextRun(rule: RecurrenceRule, after: Date, created: number): Date | null {
  if (rule.end_mode === RecurrenceEndMode.AFTER_COUNT && rule.end_count != null && created >= rule.end_count) return null;
  const next = nextOccurrence(rule, after);
  if (!next) return null;
  if (rule.end_mode === RecurrenceEndMode.ON_DATE && rule.end_date) {
    if (DateTime.fromJSDate(next).setZone(safeZone(rule.time_zone)).toISODate() > rule.end_date) return null;
  }
  return next;
}

/** Last day of the calendar week / month / quarter / half-year / year containing `at`. */
function periodEnd(at: DateTime, frequency: RecurrenceFrequency): DateTime {
  switch (frequency) {
    case RecurrenceFrequency.WEEKLY:
      return at.endOf('week').startOf('day');
    case RecurrenceFrequency.MONTHLY:
      return at.endOf('month').startOf('day');
    case RecurrenceFrequency.QUARTERLY:
      return at.endOf('quarter').startOf('day');
    case RecurrenceFrequency.SEMI_ANNUAL:
      return (at.month <= 6 ? at.set({ month: 6 }) : at.set({ month: 12 })).endOf('month').startOf('day');
    default:
      return at.endOf('year').startOf('day');
  }
}

/**
 * Deadline of the assignment created at `assignedAt`. `nextOccurrenceAt` is the following occurrence
 * (used by BEFORE_NEXT). Returns null when there is no deadline or the rule cannot produce a future one.
 */
export function computeDeadline(rule: RecurrenceRule, assignedAt: Date, nextOccurrenceAt: Date | null): Date | null {
  if (rule.deadline_mode === RecurrenceDeadlineMode.NONE) return null;
  const zone = safeZone(rule.time_zone);
  const at = DateTime.fromJSDate(assignedAt).setZone(zone);
  const time = rule.deadline_time ?? DEFAULT_DEADLINE_TIME;
  const offset = rule.deadline_offset_days ?? 0;
  let result: DateTime | null = null;

  switch (rule.deadline_mode) {
    case RecurrenceDeadlineMode.AFTER_ASSIGNMENT:
      result = atTime(at.plus({ days: offset }), time);
      break;
    case RecurrenceDeadlineMode.END_OF_PERIOD:
      result = atTime(periodEnd(at, rule.frequency).minus({ days: offset }), time);
      break;
    case RecurrenceDeadlineMode.DAY_IN_PERIOD: {
      if (rule.frequency === RecurrenceFrequency.WEEKLY) {
        result = atTime(at.startOf('week').plus({ days: (rule.deadline_day ?? 1) - 1 }), time);
        if (result.toMillis() <= assignedAt.getTime()) result = atTime(result.plus({ weeks: 1 }), time);
      } else {
        const inMonth = (month: DateTime) => atTime(clampDay(month.startOf('month'), rule.deadline_day, rule.deadline_last_day), time);
        result = inMonth(at);
        if (result.toMillis() <= assignedAt.getTime()) result = inMonth(at.plus({ months: 1 }));
      }
      break;
    }
    case RecurrenceDeadlineMode.BEFORE_NEXT:
      if (!nextOccurrenceAt) return null;
      result = atTime(DateTime.fromJSDate(nextOccurrenceAt).setZone(zone).startOf('day').minus({ days: offset }), time);
      break;
  }
  return result && result.toMillis() > assignedAt.getTime() ? result.toUTC().toJSDate() : null;
}

/**
 * The next `count` occurrences with their deadlines, as the worker would create them.
 * `startNow` = the first occurrence is created immediately at `from`.
 */
export function previewOccurrences(rule: RecurrenceRule, count: number, from: Date, options: { startNow?: boolean; created?: number } = {}): RecurrenceOccurrence[] {
  const zone = safeZone(rule.time_zone);
  const out: RecurrenceOccurrence[] = [];
  let created = options.created ?? 0;
  let immediate = !!options.startNow;
  let cursor: Date | null = immediate ? from : nextRun(rule, from, created);
  while (cursor && out.length < count) {
    const reference = immediate ? endOfLocalDay(cursor, zone) : cursor;
    out.push({ run_at: cursor, deadline_at: computeDeadline(rule, cursor, nextOccurrence(rule, reference)) });
    created += 1;
    cursor = nextRun(rule, reference, created);
    immediate = false;
  }
  return out;
}

/** Cross-field validation of a rule; returns a user-facing message, or null when the rule is valid. */
export function validateRecurrenceRule(rule: RecurrenceRule): string | null {
  const { frequency } = rule;
  if (!TIME_RE.test(rule.run_time)) return 'Choose a valid time of day';
  if (rule.deadline_time && !TIME_RE.test(rule.deadline_time)) return 'Choose a valid deadline time';
  if (!DateTime.fromISO(rule.starts_on).isValid) return 'Choose a valid start date';

  if (frequency === RecurrenceFrequency.WEEKLY) {
    if (!rule.weekday || rule.weekday < 1 || rule.weekday > 7) return 'Choose the day of the week';
    if (rule.interval_count < 1 || rule.interval_count > 52) return 'Repeat every 1 to 52 weeks';
  } else {
    if (!rule.last_day_of_month && (!rule.day_of_month || rule.day_of_month < 1 || rule.day_of_month > 31)) return 'Choose the day of the month';
    const maxMonth = MAX_START_MONTH[frequency];
    if (maxMonth && (!rule.month_of_year || rule.month_of_year < 1 || rule.month_of_year > maxMonth)) return 'Choose the month';
    if (frequency === RecurrenceFrequency.MONTHLY) {
      if (rule.interval_count < 1 || rule.interval_count > 24) return 'Repeat every 1 to 24 months';
    } else if (rule.interval_count !== 1) {
      return 'Only weekly and monthly schedules can repeat at a custom interval';
    }
  }

  if (rule.end_mode === RecurrenceEndMode.AFTER_COUNT && (!rule.end_count || rule.end_count < 1)) return 'Enter how many times it should repeat';
  if (rule.end_mode === RecurrenceEndMode.ON_DATE) {
    if (!rule.end_date || !DateTime.fromISO(rule.end_date).isValid) return 'Choose the end date';
    if (rule.end_date < rule.starts_on) return 'The end date must be after the start date';
  }

  const offset = rule.deadline_offset_days;
  switch (rule.deadline_mode) {
    case RecurrenceDeadlineMode.AFTER_ASSIGNMENT:
    case RecurrenceDeadlineMode.BEFORE_NEXT:
      if (!offset || offset < 1 || offset > 366) return 'Enter the number of days for the deadline';
      break;
    case RecurrenceDeadlineMode.END_OF_PERIOD:
      if (offset == null || offset < 0 || offset > 366) return 'Enter the number of days before the end of the period';
      break;
    case RecurrenceDeadlineMode.DAY_IN_PERIOD:
      if (frequency === RecurrenceFrequency.WEEKLY) {
        if (!rule.deadline_day || rule.deadline_day < 1 || rule.deadline_day > 7) return 'Choose the deadline weekday';
      } else if (!rule.deadline_last_day && (!rule.deadline_day || rule.deadline_day < 1 || rule.deadline_day > 31)) {
        return 'Choose the deadline day of the month';
      }
      break;
  }

  if (rule.deadline_mode !== RecurrenceDeadlineMode.NONE) {
    // Every upcoming occurrence must end up with a deadline after its own creation.
    const sample = previewOccurrences(rule, 6, DateTime.fromISO(rule.starts_on, { zone: safeZone(rule.time_zone) }).minus({ days: 1 }).toJSDate());
    if (sample.some((o) => !o.deadline_at)) return 'The deadline rule gives a deadline that is before the assignment is created — adjust the offset or day';
  }
  return null;
}

import { ReminderIntervalUnit, ReminderSchedule } from 'generated/prisma';
import { addDays, diffDays, dateOnly } from '@/shared/utils/dates/dates.utils';

export type ScheduleFields = Pick<
  ReminderSchedule,
  | 'enabled'
  | 'start_days_before'
  | 'interval_count'
  | 'interval_unit'
  | 'interval_weekday'
  | 'send_time'
  | 'overdue_enabled'
  | 'overdue_interval_count'
  | 'overdue_interval_unit'
  | 'overdue_interval_weekday'
  | 'overdue_max_count'
>;

export interface EffectiveSchedule {
  enabled: boolean;
  start_days_before: number;
  interval_count: number;
  interval_unit: ReminderIntervalUnit;
  /** ISO weekday (1 = Monday … 7 = Sunday) used when the unit is WEEKS. */
  interval_weekday: number;
  send_time: string;
  overdue_enabled: boolean;
  overdue_interval_count: number;
  overdue_interval_unit: ReminderIntervalUnit;
  overdue_interval_weekday: number;
  overdue_max_count: number | null;
}

export const SCHEDULE_KEYS: (keyof ScheduleFields)[] = [
  'enabled',
  'start_days_before',
  'interval_count',
  'interval_unit',
  'interval_weekday',
  'send_time',
  'overdue_enabled',
  'overdue_interval_count',
  'overdue_interval_unit',
  'overdue_interval_weekday',
  'overdue_max_count',
];

export const FALLBACK_SCHEDULE: EffectiveSchedule = {
  enabled: true,
  start_days_before: 7,
  interval_count: 3,
  interval_unit: ReminderIntervalUnit.DAYS,
  interval_weekday: 1,
  send_time: '09:00',
  overdue_enabled: false,
  overdue_interval_count: 1,
  overdue_interval_unit: ReminderIntervalUnit.WEEKS,
  overdue_interval_weekday: 1,
  overdue_max_count: 4,
};

/**
 * Merges schedule levels from lowest to highest precedence
 * (organization → form → document → assignment → assignment requirement).
 * The most specific configured value wins; unset values fall through.
 */
export function resolveSchedule(levels: Array<Partial<ScheduleFields> | null | undefined>): EffectiveSchedule {
  const result: any = { ...FALLBACK_SCHEDULE };
  for (const level of levels) {
    if (!level) continue;
    for (const key of SCHEDULE_KEYS) {
      const value = level[key];
      if (value !== null && value !== undefined) result[key] = value;
    }
  }
  return result as EffectiveSchedule;
}

export function intervalDays(count: number, unit: ReminderIntervalUnit): number {
  if (unit === ReminderIntervalUnit.HOURS) return 1;
  return Math.max(1, count) * (unit === ReminderIntervalUnit.WEEKS ? 7 : 1);
}

const isoWeekday = (d: Date) => d.getUTCDay() || 7;

/** Weekly cadence: on `weekday` (ISO 1–7), every `count` weeks, counting from the first such weekday on or after `from`. */
function weeklyDue(from: Date, today: Date, weekday: number, count: number): boolean {
  if (today.getTime() < from.getTime()) return false;
  const first = addDays(from, (weekday - isoWeekday(from) + 7) % 7);
  const since = diffDays(first, today);
  return since >= 0 && since % (7 * Math.max(1, count)) === 0;
}

export type ReminderDecision = { due: false } | { due: true; overdue: boolean };

/**
 * Decides whether a reminder is due on `today` for one requirement.
 * - With a deadline: reminders start `start_days_before` days before it (or immediately at
 *   assignment when the deadline is closer), then repeat every interval up to the deadline;
 *   after it, overdue reminders follow their own frequency and optional maximum.
 * - Without a deadline: reminders start at assignment and repeat on the frequency.
 * The assignment day itself is covered by the assignment notification.
 */
export function isReminderDue(input: {
  schedule: EffectiveSchedule;
  today: Date;
  assignedOn: Date;
  deadline: Date | null;
  overdueSentCount: number;
  /** Current instant, assignment instant and last send time; used only by hourly intervals. */
  now?: Date;
  assignedAt?: Date | null;
  lastReminderSentAt?: Date | null;
}): ReminderDecision {
  const { schedule } = input;
  if (!schedule.enabled) return { due: false };
  const today = dateOnly(input.today);
  const assignedOn = dateOnly(input.assignedOn);
  const hourly = schedule.interval_unit === ReminderIntervalUnit.HOURS;
  // Hourly intervals count from the assignment instant, so they may start on the assignment day.
  if (!hourly && today.getTime() <= assignedOn.getTime()) return { due: false };
  const every = intervalDays(schedule.interval_count, schedule.interval_unit);
  /** Hourly: due once `count` hours passed since the last reminder, or since the assignment for the first one. */
  const hourlyDue = (count: number) => {
    const anchor = input.lastReminderSentAt ?? input.assignedAt;
    if (!anchor || !input.now) return true;
    return input.now.getTime() - anchor.getTime() >= Math.max(1, count) * 3_600_000 - 60_000;
  };

  if (!input.deadline) {
    if (hourly) return hourlyDue(schedule.interval_count) ? { due: true, overdue: false } : { due: false };
    if (schedule.interval_unit === ReminderIntervalUnit.WEEKS) {
      return weeklyDue(addDays(assignedOn, 1), today, schedule.interval_weekday, schedule.interval_count) ? { due: true, overdue: false } : { due: false };
    }
    return diffDays(assignedOn, today) % every === 0 ? { due: true, overdue: false } : { due: false };
  }

  const deadline = dateOnly(input.deadline);
  if (today.getTime() <= deadline.getTime()) {
    let start = addDays(deadline, -Math.max(0, schedule.start_days_before));
    if (start.getTime() < assignedOn.getTime()) start = assignedOn;
    if (today.getTime() < start.getTime()) return { due: false };
    if (hourly) return hourlyDue(schedule.interval_count) ? { due: true, overdue: false } : { due: false };
    if (schedule.interval_unit === ReminderIntervalUnit.WEEKS) {
      const from = start.getTime() <= assignedOn.getTime() ? addDays(assignedOn, 1) : start;
      return weeklyDue(from, today, schedule.interval_weekday, schedule.interval_count) ? { due: true, overdue: false } : { due: false };
    }
    const since = diffDays(start, today);
    if (since % every === 0 || today.getTime() === deadline.getTime()) return { due: true, overdue: false };
    return { due: false };
  }

  if (!schedule.overdue_enabled) return { due: false };
  if (schedule.overdue_max_count !== null && schedule.overdue_max_count > 0 && input.overdueSentCount >= schedule.overdue_max_count) {
    return { due: false };
  }
  if (schedule.overdue_interval_unit === ReminderIntervalUnit.HOURS) {
    return hourlyDue(schedule.overdue_interval_count) ? { due: true, overdue: true } : { due: false };
  }
  if (schedule.overdue_interval_unit === ReminderIntervalUnit.WEEKS) {
    return weeklyDue(addDays(deadline, 1), today, schedule.overdue_interval_weekday, schedule.overdue_interval_count) ? { due: true, overdue: true } : { due: false };
  }
  const overdueEvery = intervalDays(schedule.overdue_interval_count, schedule.overdue_interval_unit);
  return diffDays(deadline, today) % overdueEvery === 0 ? { due: true, overdue: true } : { due: false };
}

/** Plain-language summary, e.g. "Starts 14 days before the deadline, then every 3 days at 09:00". */
export function describeSchedule(s: EffectiveSchedule): string {
  if (!s.enabled) return 'Automatic reminders are off';
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const freq = (count: number, unit: ReminderIntervalUnit, weekday?: number) => {
    const word = unit === ReminderIntervalUnit.WEEKS ? 'week' : unit === ReminderIntervalUnit.HOURS ? 'hour' : 'day';
    const base = count === 1 ? `every ${word}` : `every ${count} ${word}s`;
    return unit === ReminderIntervalUnit.WEEKS && weekday ? `${base} on ${DAY_NAMES[weekday - 1]}` : base;
  };
  const start = s.start_days_before === 0 ? 'Starts on the deadline day' : `Starts ${s.start_days_before} days before the deadline`;
  let text = s.interval_unit === ReminderIntervalUnit.HOURS ? `${start}, then ${freq(s.interval_count, s.interval_unit)} from assignment` : `${start}, then ${freq(s.interval_count, s.interval_unit, s.interval_weekday)} at ${s.send_time}`;
  if (s.interval_unit === ReminderIntervalUnit.DAYS) text += ' and on the deadline day';
  if (s.overdue_enabled) {
    text += `; after the deadline ${freq(s.overdue_interval_count, s.overdue_interval_unit, s.overdue_interval_weekday)}`;
    if (s.overdue_max_count && s.overdue_max_count > 0) text += ` (max ${s.overdue_max_count})`;
  }
  return text;
}

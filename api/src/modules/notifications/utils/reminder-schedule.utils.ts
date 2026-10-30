import { ReminderIntervalUnit, ReminderSchedule } from 'generated/prisma';
import { addDays, diffDays, dateOnly } from '@/shared/utils/dates/dates.utils';

export type ScheduleFields = Pick<
  ReminderSchedule,
  | 'enabled'
  | 'start_days_before'
  | 'interval_count'
  | 'interval_unit'
  | 'send_time'
  | 'overdue_enabled'
  | 'overdue_interval_count'
  | 'overdue_interval_unit'
  | 'overdue_max_count'
>;

export interface EffectiveSchedule {
  enabled: boolean;
  start_days_before: number;
  interval_count: number;
  interval_unit: ReminderIntervalUnit;
  send_time: string;
  overdue_enabled: boolean;
  overdue_interval_count: number;
  overdue_interval_unit: ReminderIntervalUnit;
  overdue_max_count: number | null;
}

export const SCHEDULE_KEYS: (keyof ScheduleFields)[] = [
  'enabled',
  'start_days_before',
  'interval_count',
  'interval_unit',
  'send_time',
  'overdue_enabled',
  'overdue_interval_count',
  'overdue_interval_unit',
  'overdue_max_count',
];

export const FALLBACK_SCHEDULE: EffectiveSchedule = {
  enabled: true,
  start_days_before: 7,
  interval_count: 3,
  interval_unit: ReminderIntervalUnit.DAYS,
  send_time: '09:00',
  overdue_enabled: true,
  overdue_interval_count: 1,
  overdue_interval_unit: ReminderIntervalUnit.WEEKS,
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
  return Math.max(1, count) * (unit === ReminderIntervalUnit.WEEKS ? 7 : 1);
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
}): ReminderDecision {
  const { schedule } = input;
  if (!schedule.enabled) return { due: false };
  const today = dateOnly(input.today);
  const assignedOn = dateOnly(input.assignedOn);
  if (today.getTime() <= assignedOn.getTime()) return { due: false };
  const every = intervalDays(schedule.interval_count, schedule.interval_unit);

  if (!input.deadline) {
    return diffDays(assignedOn, today) % every === 0 ? { due: true, overdue: false } : { due: false };
  }

  const deadline = dateOnly(input.deadline);
  if (today.getTime() <= deadline.getTime()) {
    let start = addDays(deadline, -Math.max(0, schedule.start_days_before));
    if (start.getTime() < assignedOn.getTime()) start = assignedOn;
    if (today.getTime() < start.getTime()) return { due: false };
    const since = diffDays(start, today);
    if (since % every === 0 || today.getTime() === deadline.getTime()) return { due: true, overdue: false };
    return { due: false };
  }

  if (!schedule.overdue_enabled) return { due: false };
  if (schedule.overdue_max_count !== null && input.overdueSentCount >= schedule.overdue_max_count) {
    return { due: false };
  }
  const overdueEvery = intervalDays(schedule.overdue_interval_count, schedule.overdue_interval_unit);
  return diffDays(deadline, today) % overdueEvery === 0 ? { due: true, overdue: true } : { due: false };
}

/** Plain-language summary, e.g. "Starts 14 days before the deadline, then every 3 days at 09:00". */
export function describeSchedule(s: EffectiveSchedule): string {
  if (!s.enabled) return 'Automatic reminders are off';
  const freq = (count: number, unit: ReminderIntervalUnit) => {
    const word = unit === ReminderIntervalUnit.WEEKS ? 'week' : 'day';
    return count === 1 ? `every ${word}` : `every ${count} ${word}s`;
  };
  const start = s.start_days_before === 0 ? 'Starts on the deadline day' : `Starts ${s.start_days_before} days before the deadline`;
  let text = `${start}, then ${freq(s.interval_count, s.interval_unit)} at ${s.send_time}`;
  if (s.overdue_enabled) {
    text += `; after the deadline ${freq(s.overdue_interval_count, s.overdue_interval_unit)}`;
    if (s.overdue_max_count) text += ` (max ${s.overdue_max_count})`;
  }
  return text;
}

import { ReminderIntervalUnit } from 'generated/prisma';
import { describeSchedule, FALLBACK_SCHEDULE, isReminderDue, resolveSchedule } from './reminder-schedule.utils';
import { applyQuietHours } from '@/shared/utils/dates/dates.utils';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('resolveSchedule', () => {
  it('applies the most specific configured level; unset values fall through', () => {
    const s = resolveSchedule([
      { ...FALLBACK_SCHEDULE, start_days_before: 14, send_time: '09:00' }, // organization
      { interval_count: 2 }, // form
      null, // document
      { send_time: '10:30' }, // assignment
      { enabled: undefined }, // requirement (unset)
    ]);
    expect(s.start_days_before).toBe(14);
    expect(s.interval_count).toBe(2);
    expect(s.send_time).toBe('10:30');
    expect(s.enabled).toBe(true);
  });

  it('describes the schedule in plain language', () => {
    const s = resolveSchedule([{ start_days_before: 14, interval_count: 3, interval_unit: ReminderIntervalUnit.DAYS, send_time: '09:00', overdue_enabled: false }]);
    expect(describeSchedule(s)).toBe('Starts 14 days before the deadline, then every 3 days at 09:00 and on the deadline day');
  });
});

describe('isReminderDue', () => {
  const schedule = resolveSchedule([{ start_days_before: 6, interval_count: 3, interval_unit: ReminderIntervalUnit.DAYS, overdue_enabled: true, overdue_interval_count: 1, overdue_interval_unit: ReminderIntervalUnit.WEEKS, overdue_max_count: 2 }]);
  const base = { schedule, assignedOn: d('2026-10-01'), deadline: d('2026-10-20'), overdueSentCount: 0 };

  it('starts N days before the deadline and repeats on the interval', () => {
    expect(isReminderDue({ ...base, today: d('2026-10-13') }).due).toBe(false);
    expect(isReminderDue({ ...base, today: d('2026-10-14') }).due).toBe(true);
    expect(isReminderDue({ ...base, today: d('2026-10-15') }).due).toBe(false);
    expect(isReminderDue({ ...base, today: d('2026-10-17') }).due).toBe(true);
    expect(isReminderDue({ ...base, today: d('2026-10-20') }).due).toBe(true);
  });

  it('starts immediately when the deadline is closer than the start offset', () => {
    const r = { ...base, assignedOn: d('2026-10-18') };
    expect(isReminderDue({ ...r, today: d('2026-10-18') }).due).toBe(false); // assignment email covers day 0
    expect(isReminderDue({ ...r, today: d('2026-10-20') }).due).toBe(true);
  });

  it('sends overdue reminders on their own frequency up to the maximum', () => {
    expect(isReminderDue({ ...base, today: d('2026-10-26') })).toEqual({ due: true, overdue: true }); // first Monday after the deadline
    expect(isReminderDue({ ...base, today: d('2026-10-27') }).due).toBe(false);
    expect(isReminderDue({ ...base, today: d('2026-10-26'), overdueSentCount: 2 }).due).toBe(false);
  });

  it('repeats from the assignment date without a deadline, and never when disabled', () => {
    const r = { ...base, deadline: null };
    expect(isReminderDue({ ...r, today: d('2026-10-04') }).due).toBe(true);
    expect(isReminderDue({ ...r, today: d('2026-10-05') }).due).toBe(false);
    expect(isReminderDue({ ...r, schedule: { ...schedule, enabled: false }, today: d('2026-10-04') }).due).toBe(false);
  });
});

describe('applyQuietHours', () => {
  it('moves sends inside quiet hours to their end, including windows over midnight', () => {
    expect(applyQuietHours('21:00', '20:00', '08:00')).toBe('08:00');
    expect(applyQuietHours('07:59', '20:00', '08:00')).toBe('08:00');
    expect(applyQuietHours('09:00', '20:00', '08:00')).toBe('09:00');
    expect(applyQuietHours('13:00', '12:00', '14:00')).toBe('14:00');
  });
});

describe('hourly intervals and overdue max', () => {
  const hourly = resolveSchedule([{ start_days_before: 3, interval_count: 4, interval_unit: ReminderIntervalUnit.HOURS }]);
  const base = { schedule: hourly, assignedOn: d('2026-10-01'), deadline: d('2026-10-20'), overdueSentCount: 0 };
  const at = (iso: string) => new Date(iso);

  it('repeats every N hours inside the window, first send without history', () => {
    const today = d('2026-10-18');
    expect(isReminderDue({ ...base, today, now: at('2026-10-18T09:00:00Z'), lastReminderSentAt: null }).due).toBe(true);
    expect(isReminderDue({ ...base, today, now: at('2026-10-18T11:00:00Z'), lastReminderSentAt: at('2026-10-18T09:00:00Z') }).due).toBe(false);
    expect(isReminderDue({ ...base, today, now: at('2026-10-18T13:00:00Z'), lastReminderSentAt: at('2026-10-18T09:00:00Z') }).due).toBe(true);
    expect(isReminderDue({ ...base, today: d('2026-10-10'), now: at('2026-10-10T09:00:00Z'), lastReminderSentAt: null }).due).toBe(false);
  });

  it('treats overdue_max_count 0 as unlimited', () => {
    const s = resolveSchedule([{ overdue_enabled: true, overdue_interval_count: 1, overdue_interval_unit: ReminderIntervalUnit.DAYS, overdue_max_count: 0 }]);
    expect(isReminderDue({ schedule: s, today: d('2026-10-25'), assignedOn: d('2026-10-01'), deadline: d('2026-10-20'), overdueSentCount: 50 }).due).toBe(true);
  });
});

describe('hourly reminders count from the assignment instant', () => {
  const hourly = resolveSchedule([{ start_days_before: 30, interval_count: 4, interval_unit: ReminderIntervalUnit.HOURS }]);
  const at = (iso: string) => new Date(iso);
  const base = { schedule: hourly, assignedOn: d('2026-10-18'), assignedAt: at('2026-10-18T14:30:00Z'), deadline: d('2026-10-30'), overdueSentCount: 0, lastReminderSentAt: null };

  it('first reminder N hours after assignment, even on the assignment day', () => {
    expect(isReminderDue({ ...base, today: d('2026-10-18'), now: at('2026-10-18T16:00:00Z') }).due).toBe(false);
    expect(isReminderDue({ ...base, today: d('2026-10-18'), now: at('2026-10-18T18:31:00Z') }).due).toBe(true);
  });

  it('then every N hours after the last reminder', () => {
    const last = at('2026-10-18T18:35:00Z');
    expect(isReminderDue({ ...base, today: d('2026-10-18'), now: at('2026-10-18T21:00:00Z'), lastReminderSentAt: last }).due).toBe(false);
    expect(isReminderDue({ ...base, today: d('2026-10-18'), now: at('2026-10-18T22:40:00Z'), lastReminderSentAt: last }).due).toBe(true);
  });
});

describe('weekly reminders on a chosen weekday', () => {
  // 2026-10-19 is a Monday.
  const weekly = (weekday: number, count = 1) =>
    resolveSchedule([{ start_days_before: 60, interval_count: count, interval_unit: ReminderIntervalUnit.WEEKS, interval_weekday: weekday, overdue_enabled: true, overdue_interval_count: 1, overdue_interval_unit: ReminderIntervalUnit.WEEKS, overdue_interval_weekday: 5 }]);
  const base = { assignedOn: d('2026-10-14'), deadline: d('2026-11-30'), overdueSentCount: 0 };

  it('sends only on the chosen weekday', () => {
    const schedule = weekly(1); // Monday
    expect(isReminderDue({ ...base, schedule, today: d('2026-10-19') }).due).toBe(true); // Mon
    expect(isReminderDue({ ...base, schedule, today: d('2026-10-20') }).due).toBe(false); // Tue
    expect(isReminderDue({ ...base, schedule, today: d('2026-10-26') }).due).toBe(true); // next Mon
  });

  it('every 2 weeks skips alternate weeks', () => {
    const schedule = weekly(1, 2);
    expect(isReminderDue({ ...base, schedule, today: d('2026-10-19') }).due).toBe(true);
    expect(isReminderDue({ ...base, schedule, today: d('2026-10-26') }).due).toBe(false);
    expect(isReminderDue({ ...base, schedule, today: d('2026-11-02') }).due).toBe(true);
  });

  it('overdue weekly reminders use their own weekday (Friday)', () => {
    const schedule = weekly(1);
    const over = { ...base, deadline: d('2026-11-02'), schedule };
    expect(isReminderDue({ ...over, today: d('2026-11-06') }).due).toBe(true); // Fri
    expect(isReminderDue({ ...over, today: d('2026-11-09') }).due).toBe(false); // Mon
  });

  it('does not add a deadline-day reminder on another weekday', () => {
    const schedule = weekly(1);
    expect(isReminderDue({ ...base, schedule, today: d('2026-11-30') }).due).toBe(true); // deadline is a Monday here
    expect(isReminderDue({ ...base, deadline: d('2026-12-02'), schedule, today: d('2026-12-02') }).due).toBe(false); // Wednesday deadline
  });
});

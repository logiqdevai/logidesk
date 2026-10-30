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
    expect(describeSchedule(s)).toBe('Starts 14 days before the deadline, then every 3 days at 09:00');
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
    expect(isReminderDue({ ...base, today: d('2026-10-27') })).toEqual({ due: true, overdue: true });
    expect(isReminderDue({ ...base, today: d('2026-10-24') }).due).toBe(false);
    expect(isReminderDue({ ...base, today: d('2026-10-27'), overdueSentCount: 2 }).due).toBe(false);
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

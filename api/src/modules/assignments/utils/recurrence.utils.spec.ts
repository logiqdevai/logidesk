import { RecurrenceDeadlineMode, RecurrenceEndMode, RecurrenceFrequency } from 'generated/prisma';
import { computeDeadline, nextOccurrence, nextRun, previewOccurrences, RecurrenceRule, validateRecurrenceRule } from './recurrence.utils';

const rule = (over: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
  frequency: RecurrenceFrequency.WEEKLY,
  interval_count: 1,
  weekday: 2,
  day_of_month: null,
  last_day_of_month: false,
  month_of_year: null,
  run_time: '09:00',
  time_zone: 'UTC',
  starts_on: '2027-01-01',
  end_mode: RecurrenceEndMode.NEVER,
  end_count: null,
  end_date: null,
  deadline_mode: RecurrenceDeadlineMode.NONE,
  deadline_offset_days: null,
  deadline_time: null,
  deadline_day: null,
  deadline_last_day: false,
  ...over,
});
const monthly = (over: Partial<RecurrenceRule> = {}) => rule({ frequency: RecurrenceFrequency.MONTHLY, weekday: null, day_of_month: 15, ...over });
const iso = (d: Date | null) => d?.toISOString() ?? null;
const runs = (r: RecurrenceRule, from: string, count: number) => previewOccurrences(r, count, new Date(from)).map((o) => o.run_at.toISOString());

describe('weekly', () => {
  it('lands on the chosen weekday and time', () => {
    expect(runs(rule(), '2027-01-01T00:00:00Z', 3)).toEqual(['2027-01-05T09:00:00.000Z', '2027-01-12T09:00:00.000Z', '2027-01-19T09:00:00.000Z']);
  });
  it('runs later the same day when the time is still ahead, otherwise next week', () => {
    expect(iso(nextOccurrence(rule(), new Date('2027-01-05T08:00:00Z')))).toBe('2027-01-05T09:00:00.000Z');
    expect(iso(nextOccurrence(rule(), new Date('2027-01-05T09:00:00Z')))).toBe('2027-01-12T09:00:00.000Z');
  });
  it('supports every N weeks, counting from the first matching weekday', () => {
    expect(runs(rule({ interval_count: 2 }), '2027-01-01T00:00:00Z', 3)).toEqual(['2027-01-05T09:00:00.000Z', '2027-01-19T09:00:00.000Z', '2027-02-02T09:00:00.000Z']);
  });
  it('never runs before the start date', () => {
    expect(iso(nextOccurrence(rule({ starts_on: '2027-03-01' }), new Date('2027-01-01T00:00:00Z')))).toBe('2027-03-02T09:00:00.000Z');
  });
});

describe('monthly', () => {
  it('runs on the chosen day each month', () => {
    expect(runs(monthly(), '2027-01-01T00:00:00Z', 3)).toEqual(['2027-01-15T09:00:00.000Z', '2027-02-15T09:00:00.000Z', '2027-03-15T09:00:00.000Z']);
  });
  it('clamps day 31 to the end of shorter months, including leap years', () => {
    expect(runs(monthly({ day_of_month: 31 }), '2027-01-01T00:00:00Z', 3)).toEqual(['2027-01-31T09:00:00.000Z', '2027-02-28T09:00:00.000Z', '2027-03-31T09:00:00.000Z']);
    expect(iso(nextOccurrence(monthly({ day_of_month: 31 }), new Date('2028-02-01T00:00:00Z')))).toBe('2028-02-29T09:00:00.000Z');
  });
  it('supports "last day of the month"', () => {
    expect(runs(monthly({ day_of_month: null, last_day_of_month: true }), '2027-04-01T00:00:00Z', 2)).toEqual(['2027-04-30T09:00:00.000Z', '2027-05-31T09:00:00.000Z']);
  });
  it('supports every N months, starting from the first run on/after the start date', () => {
    expect(runs(monthly({ interval_count: 2, starts_on: '2027-01-20' }), '2027-01-01T00:00:00Z', 3)).toEqual(['2027-02-15T09:00:00.000Z', '2027-04-15T09:00:00.000Z', '2027-06-15T09:00:00.000Z']);
  });
});

describe('quarterly, semi-annual and yearly', () => {
  it('every 3 months from the chosen start month', () => {
    const r = rule({ frequency: RecurrenceFrequency.QUARTERLY, weekday: null, day_of_month: 10, month_of_year: 2 });
    expect(runs(r, '2027-01-01T00:00:00Z', 5)).toEqual([
      '2027-02-10T09:00:00.000Z',
      '2027-05-10T09:00:00.000Z',
      '2027-08-10T09:00:00.000Z',
      '2027-11-10T09:00:00.000Z',
      '2028-02-10T09:00:00.000Z',
    ]);
  });
  it('every 6 months from the chosen start month', () => {
    const r = rule({ frequency: RecurrenceFrequency.SEMI_ANNUAL, weekday: null, day_of_month: 1, month_of_year: 3 });
    expect(runs(r, '2027-01-01T00:00:00Z', 3)).toEqual(['2027-03-01T09:00:00.000Z', '2027-09-01T09:00:00.000Z', '2028-03-01T09:00:00.000Z']);
  });
  it('skips cycle months that fall before the start date', () => {
    const r = rule({ frequency: RecurrenceFrequency.QUARTERLY, weekday: null, day_of_month: 10, month_of_year: 1, starts_on: '2027-02-01' });
    expect(iso(nextOccurrence(r, new Date('2027-01-01T00:00:00Z')))).toBe('2027-04-10T09:00:00.000Z');
  });
  it('yearly on a month and day, clamping Feb 29 in non-leap years', () => {
    const r = rule({ frequency: RecurrenceFrequency.YEARLY, weekday: null, day_of_month: 29, month_of_year: 2 });
    expect(runs(r, '2027-01-01T00:00:00Z', 3)).toEqual(['2027-02-28T09:00:00.000Z', '2028-02-29T09:00:00.000Z', '2029-02-28T09:00:00.000Z']);
  });
});

describe('time zones', () => {
  it('keeps the local run time across the DST change (Europe/Athens, 28 Mar 2027)', () => {
    const r = monthly({ time_zone: 'Europe/Athens', day_of_month: 27 });
    const [march, april] = runs(r, '2027-03-01T00:00:00Z', 2);
    expect(march).toBe('2027-03-27T07:00:00.000Z'); // UTC+2
    expect(april).toBe('2027-04-27T06:00:00.000Z'); // UTC+3
  });
});

describe('end conditions', () => {
  it('stops after N occurrences', () => {
    const r = rule({ end_mode: RecurrenceEndMode.AFTER_COUNT, end_count: 2 });
    expect(runs(r, '2027-01-01T00:00:00Z', 10)).toHaveLength(2);
    expect(nextRun(r, new Date('2027-01-05T09:00:00Z'), 2)).toBeNull();
  });
  it('stops after the end date', () => {
    const r = rule({ end_mode: RecurrenceEndMode.ON_DATE, end_date: '2027-01-12' });
    expect(runs(r, '2027-01-01T00:00:00Z', 10)).toEqual(['2027-01-05T09:00:00.000Z', '2027-01-12T09:00:00.000Z']);
  });
});

describe('start now', () => {
  it('creates the first occurrence immediately and does not repeat it later the same day', () => {
    const now = new Date('2027-01-05T08:00:00Z'); // Tuesday, before the 09:00 run time
    const out = previewOccurrences(rule(), 3, now, { startNow: true }).map((o) => o.run_at.toISOString());
    expect(out).toEqual(['2027-01-05T08:00:00.000Z', '2027-01-12T09:00:00.000Z', '2027-01-19T09:00:00.000Z']);
  });
});

describe('deadlines', () => {
  const assigned = new Date('2027-01-05T09:00:00Z'); // Tuesday
  const nextRunAt = new Date('2027-01-12T09:00:00Z');

  it('has none by default', () => expect(computeDeadline(rule(), assigned, nextRunAt)).toBeNull());

  it('N days after assignment at a set time', () => {
    const r = rule({ deadline_mode: RecurrenceDeadlineMode.AFTER_ASSIGNMENT, deadline_offset_days: 3, deadline_time: '17:00' });
    expect(iso(computeDeadline(r, assigned, nextRunAt))).toBe('2027-01-08T17:00:00.000Z');
  });

  it('end of the period, minus days (weekly -> Sunday)', () => {
    const r = rule({ deadline_mode: RecurrenceDeadlineMode.END_OF_PERIOD, deadline_offset_days: 2 });
    expect(iso(computeDeadline(r, assigned, nextRunAt))).toBe('2027-01-08T23:59:00.000Z');
  });

  it.each([
    [RecurrenceFrequency.MONTHLY, 1, '2027-02-28T23:59:00.000Z', '2027-02-10T09:00:00Z'],
    [RecurrenceFrequency.QUARTERLY, 1, '2027-03-31T23:59:00.000Z', '2027-02-10T09:00:00Z'],
    [RecurrenceFrequency.SEMI_ANNUAL, 1, '2027-06-30T23:59:00.000Z', '2027-02-10T09:00:00Z'],
    [RecurrenceFrequency.YEARLY, 1, '2027-12-31T23:59:00.000Z', '2027-02-10T09:00:00Z'],
  ])('end of the %s period', (frequency, _i, expected, at) => {
    const r = rule({ frequency, weekday: null, day_of_month: 10, month_of_year: 1, deadline_mode: RecurrenceDeadlineMode.END_OF_PERIOD, deadline_offset_days: 0 });
    expect(iso(computeDeadline(r, new Date(at), null))).toBe(expected);
  });

  it('a weekday within the week, rolling to next week when already past', () => {
    const r = rule({ deadline_mode: RecurrenceDeadlineMode.DAY_IN_PERIOD, deadline_day: 5 });
    expect(iso(computeDeadline(r, assigned, nextRunAt))).toBe('2027-01-08T23:59:00.000Z');
    expect(iso(computeDeadline({ ...r, deadline_day: 1 }, assigned, nextRunAt))).toBe('2027-01-11T23:59:00.000Z');
  });

  it('a day of the month, rolling to next month when already past', () => {
    const r = monthly({ deadline_mode: RecurrenceDeadlineMode.DAY_IN_PERIOD, deadline_day: 25 });
    expect(iso(computeDeadline(r, new Date('2027-01-15T09:00:00Z'), null))).toBe('2027-01-25T23:59:00.000Z');
    expect(iso(computeDeadline({ ...r, deadline_day: 10 }, new Date('2027-01-15T09:00:00Z'), null))).toBe('2027-02-10T23:59:00.000Z');
    expect(iso(computeDeadline({ ...r, deadline_day: null, deadline_last_day: true }, new Date('2027-02-15T09:00:00Z'), null))).toBe('2027-02-28T23:59:00.000Z');
  });

  it('N days before the next occurrence', () => {
    const r = rule({ deadline_mode: RecurrenceDeadlineMode.BEFORE_NEXT, deadline_offset_days: 1 });
    expect(iso(computeDeadline(r, assigned, nextRunAt))).toBe('2027-01-11T23:59:00.000Z');
  });
});

describe('validateRecurrenceRule', () => {
  it('accepts a valid rule', () => expect(validateRecurrenceRule(rule())).toBeNull());
  it('requires the weekday for weekly and the day for the rest', () => {
    expect(validateRecurrenceRule(rule({ weekday: null }))).toMatch(/day of the week/);
    expect(validateRecurrenceRule(monthly({ day_of_month: null }))).toMatch(/day of the month/);
  });
  it('requires a start month for quarterly / semi-annual / yearly in range', () => {
    expect(validateRecurrenceRule(rule({ frequency: RecurrenceFrequency.QUARTERLY, day_of_month: 1, month_of_year: 4 }))).toMatch(/month/);
    expect(validateRecurrenceRule(rule({ frequency: RecurrenceFrequency.YEARLY, day_of_month: 1, month_of_year: 12 }))).toBeNull();
  });
  it('only allows custom intervals for weekly and monthly', () => {
    expect(validateRecurrenceRule(rule({ frequency: RecurrenceFrequency.YEARLY, day_of_month: 1, month_of_year: 1, interval_count: 2 }))).toMatch(/custom interval/);
  });
  it('validates the end condition', () => {
    expect(validateRecurrenceRule(rule({ end_mode: RecurrenceEndMode.AFTER_COUNT }))).toMatch(/how many/);
    expect(validateRecurrenceRule(rule({ end_mode: RecurrenceEndMode.ON_DATE, end_date: '2026-12-31' }))).toMatch(/end date/);
  });
  it('rejects a deadline rule that lands before the assignment', () => {
    const r = rule({ deadline_mode: RecurrenceDeadlineMode.BEFORE_NEXT, deadline_offset_days: 8 });
    expect(validateRecurrenceRule(r)).toMatch(/before the assignment/);
    expect(validateRecurrenceRule({ ...r, deadline_offset_days: 1 })).toBeNull();
  });
});

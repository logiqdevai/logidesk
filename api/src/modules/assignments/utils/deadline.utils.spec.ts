import { DeadlinePolicy } from 'generated/prisma';
import { earliestDeadline, formDefaultDeadline } from './deadline.utils';

const base = { default_deadline_days: null, default_deadline_date: null, default_deadline_time: null };
const iso = (d: Date | null) => d?.toISOString() ?? null;

describe('formDefaultDeadline', () => {
  const assignedAt = new Date('2026-11-03T10:00:00Z'); // 12:00 in Athens (UTC+2)

  it('returns null without a default deadline', () => {
    expect(formDefaultDeadline({ ...base, default_deadline_policy: DeadlinePolicy.NONE }, assignedAt, 'Europe/Athens')).toBeNull();
  });

  it('N days after assignment at the configured local time', () => {
    const v = { ...base, default_deadline_policy: DeadlinePolicy.AFTER_ASSIGNMENT, default_deadline_days: 14, default_deadline_time: '17:00' };
    expect(iso(formDefaultDeadline(v, assignedAt, 'Europe/Athens'))).toBe('2026-11-17T15:00:00.000Z');
  });

  it('defaults to 23:59 local time', () => {
    const v = { ...base, default_deadline_policy: DeadlinePolicy.AFTER_ASSIGNMENT, default_deadline_days: 1 };
    expect(iso(formDefaultDeadline(v, assignedAt, 'Europe/Athens'))).toBe('2026-11-04T21:59:00.000Z');
  });

  it('a fixed date is read as a calendar date in the organization zone', () => {
    const v = {
      ...base,
      default_deadline_policy: DeadlinePolicy.FIXED_DATE,
      default_deadline_date: new Date('2026-12-31T00:00:00Z'),
      default_deadline_time: '12:00',
    };
    expect(iso(formDefaultDeadline(v, assignedAt, 'Europe/Athens'))).toBe('2026-12-31T10:00:00.000Z');
  });

  it('ignores an incomplete policy', () => {
    expect(formDefaultDeadline({ ...base, default_deadline_policy: DeadlinePolicy.AFTER_ASSIGNMENT }, assignedAt, 'Europe/Athens')).toBeNull();
    expect(formDefaultDeadline({ ...base, default_deadline_policy: DeadlinePolicy.FIXED_DATE }, assignedAt, 'Europe/Athens')).toBeNull();
  });
});

describe('earliestDeadline', () => {
  it('picks the earliest set deadline', () => {
    const a = new Date('2026-12-01T00:00:00Z');
    const b = new Date('2026-11-20T00:00:00Z');
    expect(earliestDeadline([null, a, undefined, b])).toBe(b);
    expect(earliestDeadline([null, undefined])).toBeNull();
  });
});

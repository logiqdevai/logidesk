import { AssignmentRecurrence, Prisma, RecurrenceDeadlineMode, RecurrenceEndMode, RecurrenceOverlapPolicy, RecurrenceStatus } from 'generated/prisma';
import { dateOnly, localDateString, safeZone, toIsoDate, toIsoDateTime } from '@/shared/utils/dates/dates.utils';
import { RecurrenceDto } from '../dto/recurrence.dto';
import { previewOccurrences, RecurrenceRule } from './recurrence.utils';

/** The schedule fields of a stored series. */
export function rowToRule(row: AssignmentRecurrence): RecurrenceRule {
  return {
    frequency: row.frequency,
    interval_count: row.interval_count,
    weekday: row.weekday,
    day_of_month: row.day_of_month,
    last_day_of_month: row.last_day_of_month,
    month_of_year: row.month_of_year,
    run_time: row.run_time,
    time_zone: row.time_zone,
    starts_on: toIsoDate(row.starts_on),
    end_mode: row.end_mode,
    end_count: row.end_count,
    end_date: toIsoDate(row.end_date),
    deadline_mode: row.deadline_mode,
    deadline_offset_days: row.deadline_offset_days,
    deadline_time: row.deadline_time,
    deadline_day: row.deadline_day,
    deadline_last_day: row.deadline_last_day,
  };
}

/** Builds a rule from a request; `base` supplies the current values when editing an existing series. */
export function dtoToRule(dto: Partial<RecurrenceDto>, timeZone: string, base?: RecurrenceRule): RecurrenceRule {
  const zone = safeZone(base?.time_zone ?? timeZone);
  const pick = <K extends keyof RecurrenceRule>(key: K, fromDto: unknown, fallback: RecurrenceRule[K]): RecurrenceRule[K] =>
    fromDto === undefined ? (base ? base[key] : fallback) : (fromDto as RecurrenceRule[K]);
  const frequency = dto.frequency ?? base?.frequency;
  const deadlineMode = pick('deadline_mode', dto.deadline_mode, RecurrenceDeadlineMode.NONE);
  return {
    frequency,
    interval_count: pick('interval_count', dto.interval_count, 1),
    weekday: pick('weekday', dto.weekday, null),
    day_of_month: pick('day_of_month', dto.day_of_month, null),
    last_day_of_month: pick('last_day_of_month', dto.last_day_of_month, false),
    month_of_year: pick('month_of_year', dto.month_of_year, null),
    run_time: pick('run_time', dto.run_time, '09:00'),
    time_zone: zone,
    starts_on: pick('starts_on', dto.starts_on?.slice(0, 10), localDateString(zone)),
    end_mode: pick('end_mode', dto.end_mode, RecurrenceEndMode.NEVER),
    end_count: pick('end_count', dto.end_count, null),
    end_date: pick('end_date', dto.end_date?.slice(0, 10), null),
    deadline_mode: deadlineMode,
    deadline_offset_days: pick('deadline_offset_days', dto.deadline_offset_days, null),
    deadline_time: pick('deadline_time', dto.deadline_time, null),
    deadline_day: pick('deadline_day', dto.deadline_day, null),
    deadline_last_day: pick('deadline_last_day', dto.deadline_last_day, false),
  };
}

/** Prisma columns for a rule. Fields that do not apply to the chosen frequency / modes are cleared. */
export function ruleToData(rule: RecurrenceRule): Omit<Prisma.AssignmentRecurrenceUncheckedCreateInput, 'organization_id' | 'client_id' | 'form_ids'> {
  const weekly = rule.frequency === 'WEEKLY';
  const deadline = rule.deadline_mode;
  const usesOffset = deadline === 'AFTER_ASSIGNMENT' || deadline === 'END_OF_PERIOD' || deadline === 'BEFORE_NEXT';
  return {
    frequency: rule.frequency,
    interval_count: rule.interval_count,
    weekday: weekly ? rule.weekday : null,
    day_of_month: weekly || rule.last_day_of_month ? null : rule.day_of_month,
    last_day_of_month: weekly ? false : rule.last_day_of_month,
    month_of_year: rule.frequency === 'QUARTERLY' || rule.frequency === 'SEMI_ANNUAL' || rule.frequency === 'YEARLY' ? rule.month_of_year : null,
    run_time: rule.run_time,
    time_zone: rule.time_zone,
    starts_on: dateOnly(rule.starts_on),
    end_mode: rule.end_mode,
    end_count: rule.end_mode === 'AFTER_COUNT' ? rule.end_count : null,
    end_date: rule.end_mode === 'ON_DATE' ? dateOnly(rule.end_date) : null,
    deadline_mode: deadline,
    deadline_offset_days: usesOffset ? rule.deadline_offset_days : null,
    deadline_time: deadline === 'NONE' ? null : (rule.deadline_time ?? '23:59'),
    deadline_day: deadline === 'DAY_IN_PERIOD' && !(rule.deadline_last_day && !weekly) ? rule.deadline_day : null,
    deadline_last_day: deadline === 'DAY_IN_PERIOD' && !weekly ? rule.deadline_last_day : false,
  };
}

type SeriesRow = AssignmentRecurrence & { client?: { id: string; first_name: string; last_name: string; company?: string | null } | null };

/** API shape of a series, with its next few occurrences. */
export function serializeRecurrence(row: SeriesRow, forms: Array<{ id: string; name: string }>) {
  const rule = rowToRule(row);
  const upcoming =
    row.status === RecurrenceStatus.ACTIVE && row.next_run_at
      ? previewOccurrences(rule, 3, new Date(row.next_run_at.getTime() - 1), { created: row.occurrences_created }).map((o) => ({
          run_at: toIsoDateTime(o.run_at),
          deadline_at: toIsoDateTime(o.deadline_at),
        }))
      : [];
  return {
    id: row.id,
    client_id: row.client_id,
    client: row.client ? { id: row.client.id, name: `${row.client.first_name} ${row.client.last_name}`.trim(), company_name: row.client.company ?? null } : null,
    form_ids: row.form_ids,
    forms,
    status: row.status,
    frequency: row.frequency,
    interval_count: row.interval_count,
    weekday: row.weekday,
    day_of_month: row.day_of_month,
    last_day_of_month: row.last_day_of_month,
    month_of_year: row.month_of_year,
    run_time: row.run_time,
    time_zone: row.time_zone,
    starts_on: toIsoDate(row.starts_on),
    end_mode: row.end_mode,
    end_count: row.end_count,
    end_date: toIsoDate(row.end_date),
    deadline_mode: row.deadline_mode,
    deadline_offset_days: row.deadline_offset_days,
    deadline_time: row.deadline_time,
    deadline_day: row.deadline_day,
    deadline_last_day: row.deadline_last_day,
    message: row.message,
    notify_client: row.notify_client,
    overlap_policy: row.overlap_policy as RecurrenceOverlapPolicy,
    next_run_at: toIsoDateTime(row.next_run_at),
    last_run_at: toIsoDateTime(row.last_run_at),
    occurrences_created: row.occurrences_created,
    upcoming,
    created_at: toIsoDateTime(row.created_at),
  };
}

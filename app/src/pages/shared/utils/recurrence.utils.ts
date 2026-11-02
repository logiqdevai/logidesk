import i18n from "@/i18n";
import { getRecurrenceMonthLabel, getRecurrenceCycleMonthsLabel } from "@/config/constants/dropdowns/documents/recurrence-month-form.options";
import { getRecurrenceWeekdayLabel } from "@/config/constants/dropdowns/documents/recurrence-weekday-form.options";
import type { RecurrenceFrequency, RecurrenceInput, RecurrenceItem } from "@/features/assignments/interfaces/assignments.interfaces";

/** Starting values for a new schedule: monthly on the 1st at 09:00, due 7 days after each assignment. */
export const defaultRecurrence = (): RecurrenceInput => ({
  frequency: "MONTHLY",
  interval_count: 1,
  day_of_month: 1,
  run_time: "09:00",
  start_now: true,
  end_mode: "NEVER",
  deadline_mode: "AFTER_ASSIGNMENT",
  deadline_offset_days: 7,
  deadline_time: "17:00",
  overlap_policy: "CREATE_ANYWAY",
});

/** Switches the frequency and fills/clears the fields that depend on it so the request stays valid. */
export function changeFrequency(value: RecurrenceInput, frequency: RecurrenceFrequency): RecurrenceInput {
  const next: RecurrenceInput = { ...value, frequency };
  const everyN = frequency === "WEEKLY" || frequency === "MONTHLY";
  if (!everyN) next.interval_count = 1;
  if (frequency === "WEEKLY") {
    next.weekday = value.weekday ?? 1;
    next.day_of_month = undefined;
    next.last_day_of_month = undefined;
    next.month_of_year = undefined;
  } else {
    next.weekday = undefined;
    next.day_of_month = value.day_of_month ?? 1;
    const max = frequency === "QUARTERLY" ? 3 : frequency === "SEMI_ANNUAL" ? 6 : 12;
    next.month_of_year = frequency === "MONTHLY" ? undefined : Math.min(value.month_of_year ?? 1, max);
  }
  if (value.deadline_mode === "DAY_IN_PERIOD") {
    next.deadline_day = frequency === "WEEKLY" ? Math.min(value.deadline_day ?? 5, 7) : (value.deadline_day ?? 25);
    next.deadline_last_day = frequency === "WEEKLY" ? undefined : value.deadline_last_day;
  }
  return next;
}

type ScheduleFields = Pick<
  RecurrenceItem,
  "frequency" | "interval_count" | "weekday" | "day_of_month" | "last_day_of_month" | "month_of_year" | "run_time" | "deadline_mode" | "deadline_offset_days" | "deadline_time" | "deadline_day" | "deadline_last_day"
>;

/** "Every month on day 15 at 09:00" */
export function describeRecurrence(s: ScheduleFields): string {
  const t = i18n.getFixedT(null, "recurrence");
  const day = s.last_day_of_month ? t("summary.onLastDay") : t("summary.onDay", { day: s.day_of_month });
  const params = { count: s.interval_count, day, time: s.run_time };
  switch (s.frequency) {
    case "WEEKLY": {
      const weekday = getRecurrenceWeekdayLabel(s.weekday);
      return s.interval_count > 1 ? t("summary.weeklyEvery", { ...params, weekday }) : t("summary.weekly", { ...params, weekday });
    }
    case "MONTHLY":
      return s.interval_count > 1 ? t("summary.monthlyEvery", params) : t("summary.monthly", params);
    case "QUARTERLY":
    case "SEMI_ANNUAL":
      return t(s.frequency === "QUARTERLY" ? "summary.quarterly" : "summary.semiAnnual", { ...params, months: getRecurrenceCycleMonthsLabel(s.frequency, s.month_of_year ?? 1) });
    default:
      return t("summary.yearly", { ...params, month: getRecurrenceMonthLabel(s.month_of_year) });
  }
}

/** "Due 7 days after it is assigned (17:00)" */
export function describeRecurrenceDeadline(s: ScheduleFields): string {
  const t = i18n.getFixedT(null, "recurrence");
  const time = s.deadline_time ?? "23:59";
  switch (s.deadline_mode) {
    case "AFTER_ASSIGNMENT":
      return t("summary.dueAfter", { count: s.deadline_offset_days ?? 0, time });
    case "END_OF_PERIOD":
      return s.deadline_offset_days ? t("summary.dueBeforeEnd", { count: s.deadline_offset_days, time }) : t("summary.dueEndOfPeriod", { time });
    case "DAY_IN_PERIOD":
      return s.frequency === "WEEKLY"
        ? t("summary.dueWeekday", { weekday: getRecurrenceWeekdayLabel(s.deadline_day), time })
        : s.deadline_last_day
          ? t("summary.dueLastDay", { time })
          : t("summary.dueDay", { day: s.deadline_day, time });
    case "BEFORE_NEXT":
      return t("summary.dueBeforeNext", { count: s.deadline_offset_days ?? 1, time });
    default:
      return t("summary.noDeadline");
  }
}

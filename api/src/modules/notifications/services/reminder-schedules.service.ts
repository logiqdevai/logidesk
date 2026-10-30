import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ScheduleInputSchema } from '@/modules/forms/utils/form-definition.utils';
import { describeSchedule, EffectiveSchedule, resolveSchedule } from '../utils/reminder-schedule.utils';

type Db = PrismaService | Prisma.TransactionClient;

const SCHEDULE_SELECT = {
  enabled: true,
  start_days_before: true,
  interval_count: true,
  interval_unit: true,
  send_time: true,
  overdue_enabled: true,
  overdue_interval_count: true,
  overdue_interval_unit: true,
  overdue_max_count: true,
} as const;

export const REQUIREMENT_SCHEDULE_INCLUDE = {
  reminder_schedule: { select: SCHEDULE_SELECT },
  document_requirement: { select: { reminder_schedule: { select: SCHEDULE_SELECT } } },
  assignment: {
    select: {
      reminder_schedule: { select: SCHEDULE_SELECT },
      form_version: { select: { default_reminder_schedule: { select: SCHEDULE_SELECT } } },
    },
  },
} satisfies Prisma.AssignmentRequirementInclude;

/** Resolves the effective reminder schedule across the four configuration levels. */
@Injectable()
export class ReminderSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async organizationDefault(organizationId: string, db: Db = this.prisma) {
    const settings = await db.notificationSettings.findUnique({
      where: { organization_id: organizationId },
      select: { default_reminder_schedule: { select: SCHEDULE_SELECT }, auto_reminders_enabled: true },
    });
    return settings?.default_reminder_schedule ?? null;
  }

  resolve(
    orgDefault: Record<string, unknown> | null,
    requirement: Prisma.AssignmentRequirementGetPayload<{ include: typeof REQUIREMENT_SCHEDULE_INCLUDE }>,
  ): EffectiveSchedule {
    return resolveSchedule([
      orgDefault as any,
      requirement.assignment.form_version.default_reminder_schedule,
      requirement.document_requirement.reminder_schedule,
      requirement.assignment.reminder_schedule,
      requirement.reminder_schedule,
    ]);
  }

  summary(schedule: EffectiveSchedule) {
    return { ...schedule, summary: describeSchedule(schedule) };
  }

  /** Creates (or clears with null) a schedule override row and returns its id. */
  async createOverride(db: Db, organizationId: string, input: Record<string, unknown> | null | undefined): Promise<string | null> {
    if (!input) return null;
    const parsed = ScheduleInputSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('The reminder schedule is invalid');
    const values = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== null && v !== undefined));
    if (!Object.keys(values).length) return null;
    const row = await db.reminderSchedule.create({ data: { organization_id: organizationId, ...values } });
    return row.id;
  }
}

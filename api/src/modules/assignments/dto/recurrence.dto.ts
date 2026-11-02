import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { RecurrenceDeadlineMode, RecurrenceEndMode, RecurrenceFrequency, RecurrenceOverlapPolicy } from 'generated/prisma';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'Use a time like 09:00';

/** Schedule of a recurring form assignment (times are in the organization time zone). */
export class RecurrenceDto {
  @ApiProperty({ enum: RecurrenceFrequency })
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @ApiPropertyOptional({ description: 'Every N weeks (weekly) or N months (monthly); 1 for the other frequencies', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  interval_count?: number;

  @ApiPropertyOptional({ description: 'Weekly: ISO weekday, 1 = Monday … 7 = Sunday' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  weekday?: number;

  @ApiPropertyOptional({ description: 'Day of the month (1–31); shorter months use their last day' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  day_of_month?: number;

  @ApiPropertyOptional({ description: 'Run on the last day of the month instead of a fixed day' })
  @IsOptional()
  @IsBoolean()
  last_day_of_month?: boolean;

  @ApiPropertyOptional({ description: 'Quarterly: first month of the cycle (1–3). Semi-annual: 1–6. Yearly: the month (1–12)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month_of_year?: number;

  @ApiProperty({ example: '09:00', description: 'Time of day the assignment is created' })
  @IsString()
  @Matches(TIME, { message: TIME_MESSAGE })
  run_time: string;

  @ApiPropertyOptional({ description: 'Create the first assignment right away (default). Otherwise the first one is created on the first scheduled date', default: true })
  @IsOptional()
  @IsBoolean()
  start_now?: boolean;

  @ApiPropertyOptional({ example: '2027-01-01', description: 'First date an assignment may be created (defaults to today)' })
  @IsOptional()
  @IsISO8601({ strict: true })
  starts_on?: string;

  @ApiPropertyOptional({ enum: RecurrenceEndMode, default: RecurrenceEndMode.NEVER })
  @IsOptional()
  @IsEnum(RecurrenceEndMode)
  end_mode?: RecurrenceEndMode;

  @ApiPropertyOptional({ description: 'Total assignments to create (end_mode AFTER_COUNT, includes the first one)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  end_count?: number;

  @ApiPropertyOptional({ example: '2028-01-01', description: 'Last date an assignment may be created (end_mode ON_DATE)' })
  @IsOptional()
  @IsISO8601({ strict: true })
  end_date?: string;

  @ApiPropertyOptional({ enum: RecurrenceDeadlineMode, default: RecurrenceDeadlineMode.NONE })
  @IsOptional()
  @IsEnum(RecurrenceDeadlineMode)
  deadline_mode?: RecurrenceDeadlineMode;

  @ApiPropertyOptional({ description: 'AFTER_ASSIGNMENT: days after creation. END_OF_PERIOD: days before the period ends. BEFORE_NEXT: days before the next assignment' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(366)
  deadline_offset_days?: number;

  @ApiPropertyOptional({ example: '17:00', description: 'Deadline time of day (default 23:59)' })
  @IsOptional()
  @IsString()
  @Matches(TIME, { message: TIME_MESSAGE })
  deadline_time?: string;

  @ApiPropertyOptional({ description: 'DAY_IN_PERIOD: weekday (weekly, 1–7) or day of the month (1–31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  deadline_day?: number;

  @ApiPropertyOptional({ description: 'DAY_IN_PERIOD: deadline on the last day of the month' })
  @IsOptional()
  @IsBoolean()
  deadline_last_day?: boolean;

  @ApiPropertyOptional({ enum: RecurrenceOverlapPolicy, default: RecurrenceOverlapPolicy.CREATE_ANYWAY, description: 'What to do when the previous assignment is still open' })
  @IsOptional()
  @IsEnum(RecurrenceOverlapPolicy)
  overlap_policy?: RecurrenceOverlapPolicy;
}

/** Edits a series; changes only affect assignments created from now on. */
export class UpdateRecurrenceDto extends PartialType(RecurrenceDto) {
  @ApiPropertyOptional({ type: [String], description: 'Forms assigned on every occurrence' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one form' })
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  form_ids?: string[];

  @ApiPropertyOptional({ description: 'Message included in the client notification' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string | null;

  @ApiPropertyOptional({ description: 'Send the assignment notification to the client' })
  @IsOptional()
  @IsBoolean()
  notify_client?: boolean;
}

/** Previews the next occurrences of an unsaved schedule. */
export class PreviewRecurrenceDto extends RecurrenceDto {
  @ApiPropertyOptional({ default: 4, description: 'How many occurrences to return (1–12)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  count?: number;
}

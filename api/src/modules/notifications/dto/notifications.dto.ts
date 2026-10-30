import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { z } from 'zod';
import { EmailProvider, NotificationChannel, NotificationType, ReminderIntervalUnit } from 'generated/prisma';
import { optionalString, PaginationQuerySchema } from '@/shared/utils/pagination/pagination.utils';

export const NotificationQuerySchema = PaginationQuerySchema.extend({
  status: optionalString,
  type: optionalString,
  channel: optionalString,
  trigger: optionalString,
  client_id: optionalString,
  search: optionalString,
});
export type NotificationQueryType = z.infer<typeof NotificationQuerySchema>;

export class ReminderPreviewDto {
  @ApiProperty()
  @IsUUID()
  client_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignment_id?: string;
}

export class SendReminderDto extends ReminderPreviewDto {
  @ApiPropertyOptional({ description: 'Customized subject (defaults to the template)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subject?: string;

  @ApiPropertyOptional({ description: 'Customized message (defaults to the template)' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;
}

export class BulkReminderDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  client_ids: string[];
}

export class CreateTemplateDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NotificationChannel, default: NotificationChannel.EMAIL })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subject?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body: string;

  @ApiPropertyOptional({ description: 'Use this template by default for its type' })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}

export class ScheduleDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(365) start_days_before?: number;
  @IsOptional() @IsInt() @Min(1) @Max(52) interval_count?: number;
  @IsOptional() @IsEnum(ReminderIntervalUnit) interval_unit?: ReminderIntervalUnit;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) send_time?: string;
  @IsOptional() @IsBoolean() overdue_enabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(52) overdue_interval_count?: number;
  @IsOptional() @IsEnum(ReminderIntervalUnit) overdue_interval_unit?: ReminderIntervalUnit;
  @IsOptional() @ValidateIf((o) => o.overdue_max_count !== null) @IsInt() @Min(0) @Max(100) overdue_max_count?: number | null;
}

export class AutomationRuleUpdateDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsInt({ each: true }) @Min(0, { each: true }) @Max(365, { each: true }) offsets_days?: number[];
  @IsOptional() @IsBoolean() repeat_enabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(52) repeat_interval_count?: number;
  @IsOptional() @IsEnum(ReminderIntervalUnit) repeat_interval_unit?: ReminderIntervalUnit;
  @IsOptional() @ValidateIf((o) => o.max_sends !== null) @IsInt() @Min(1) @Max(100) max_sends?: number | null;
  @IsOptional() @ValidateIf((o) => o.template_id !== null) @IsUUID() template_id?: string | null;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  enabled_channels?: NotificationChannel[];

  @ApiPropertyOptional({ enum: EmailProvider })
  @IsOptional()
  @IsEnum(EmailProvider)
  email_provider?: EmailProvider;

  @IsOptional() @ValidateIf((o) => o.sender_name !== null) @IsString() @MaxLength(120) sender_name?: string | null;

  @IsOptional() @ValidateIf((o) => o.sender_email !== null && o.sender_email !== '') @IsEmail() sender_email?: string | null;

  @IsOptional() @IsBoolean() auto_reminders_enabled?: boolean;

  @IsOptional() @ValidateIf((o) => o.quiet_hours_start !== null) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) quiet_hours_start?: string | null;
  @IsOptional() @ValidateIf((o) => o.quiet_hours_end !== null) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) quiet_hours_end?: string | null;

  @IsOptional() @IsInt() @Min(1) @Max(10) retry_max_attempts?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1440) retry_interval_minutes?: number;

  @ApiPropertyOptional({ description: 'Organization default reminder schedule' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  default_reminder_schedule?: ScheduleDto;

  @ApiPropertyOptional({ type: [AutomationRuleUpdateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationRuleUpdateDto)
  automation_rules?: AutomationRuleUpdateDto[];

  @ApiPropertyOptional({ description: 'Organization time zone (IANA)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  time_zone?: string;

  @IsOptional() @IsObject() extra?: Record<string, unknown>;
}

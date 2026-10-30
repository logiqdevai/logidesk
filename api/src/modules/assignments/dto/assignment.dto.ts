import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty()
  @IsUUID()
  client_id: string;

  @ApiProperty({ type: [String], description: 'One or more forms to assign (latest version is used)' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one form' })
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  form_ids: string[];

  @ApiPropertyOptional({ example: '2026-12-01', description: 'Submission deadline (optional)' })
  @IsOptional()
  @ValidateIf((o) => o.deadline !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use a valid date' })
  deadline?: string | null;

  @ApiPropertyOptional({ description: 'Message included in the client notification' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ description: 'Assignment-level reminder schedule override (partial)' })
  @IsOptional()
  @IsObject()
  reminder?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Send the assignment notification to the client', default: true })
  @IsOptional()
  @IsBoolean()
  notify_client?: boolean;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @ValidateIf((o) => o.deadline !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use a valid date' })
  deadline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ description: 'Assignment-level reminder override; null removes it' })
  @IsOptional()
  @IsObject()
  reminder?: Record<string, unknown> | null;
}

export class UpdateRequirementDto {
  @ApiPropertyOptional({ example: '2026-12-01', description: 'Own deadline; null uses the assignment deadline' })
  @IsOptional()
  @ValidateIf((o) => o.deadline !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use a valid date' })
  deadline?: string | null;

  @ApiPropertyOptional({ description: 'Mark as no longer required for this assignment' })
  @IsOptional()
  @IsBoolean()
  not_required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  not_required_reason?: string;

  @ApiPropertyOptional({ description: 'Per-requirement reminder override; null removes it' })
  @IsOptional()
  @IsObject()
  reminder?: Record<string, unknown> | null;
}

export class SaveAnswersDto {
  @ApiProperty({ description: 'field_id → value' })
  @IsObject()
  answers: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Mark the response as submitted (validates required questions)' })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}

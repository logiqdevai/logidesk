import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { z } from 'zod';
import { ExpirationPolicy } from 'generated/prisma';
import { optionalString, PaginationQuerySchema } from '@/shared/utils/pagination/pagination.utils';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export class CreateFormDto {
  @ApiProperty({ example: 'Business Compliance Pack' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Instructions shown to clients above the form' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @ApiPropertyOptional({ description: 'Structured JSON schema: { sections: [{ id, title, fields: [...] }] }' })
  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_template?: boolean;

  @ApiPropertyOptional({ description: 'Shared on the public portal (when the portal is public)' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ enum: ExpirationPolicy })
  @IsOptional()
  @IsEnum(ExpirationPolicy)
  default_expiration_policy?: ExpirationPolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  default_expiration_days?: number | null;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  default_fixed_expiration_date?: string | null;

  @ApiPropertyOptional({ description: 'Form-level default reminder schedule (partial)' })
  @IsOptional()
  @IsObject()
  default_reminder?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Publish immediately' })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

export class UpdateFormDto extends PartialType(CreateFormDto) {}

export class DuplicateFormDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Create the copy as a reusable template' })
  @IsOptional()
  @IsBoolean()
  is_template?: boolean;
}

export const FormQuerySchema = PaginationQuerySchema.extend({
  search: optionalString,
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'all']).optional().default('all'),
  template: z.enum(['true', 'false', 'all']).optional().default('all'),
});
export type FormQueryType = z.infer<typeof FormQuerySchema>;

export const SubmissionsQuerySchema = z.object({
  search: optionalString,
  client_id: optionalString,
  status: optionalString,
  employee_id: optionalString,
  submitted: z.enum(['any', 'not_submitted', '7d', '30d', '90d']).optional().default('any'),
});
export type SubmissionsQueryType = z.infer<typeof SubmissionsQuerySchema>;

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { z } from 'zod';
import { optionalString, PaginationQuerySchema } from '@/shared/utils/pagination/pagination.utils';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);
const trimOrNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const lowerOrNull = ({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() || null : value);

export class CreateClientDto {
  @ApiProperty({ example: 'Dimitris' })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(80)
  first_name: string;

  @ApiProperty({ example: 'Nikolaou' })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(80)
  last_name: string;

  @ApiPropertyOptional({ example: 'Northwind Logistics Ltd' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(160)
  company?: string | null;

  @ApiProperty({ example: 'dimitris@northwind.com' })
  @Transform(lowerOrNull)
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60)
  tax_id?: string | null;

  @ApiPropertyOptional({ example: 'GR', description: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || null : value))
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter ISO code' })
  country?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @ApiPropertyOptional({ description: 'Optional company information / notes' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(2000)
  company_info?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Organization member ids assigned to the client' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  assignee_member_ids?: string[];

  @ApiPropertyOptional({ description: 'Initial internal note' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(5000)
  internal_note?: string | null;

  @ApiPropertyOptional({ description: 'Send the client portal invitation now' })
  @IsOptional()
  @IsBoolean()
  send_invitation?: boolean;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class SetAssigneesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  member_ids: string[];
}

export class CreateNoteDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;
}

export const ClientQuerySchema = PaginationQuerySchema.extend({
  search: optionalString,
  status: z.enum(['ACTIVE', 'ARCHIVED', 'all']).optional().default('ACTIVE'),
  employee_id: optionalString,
  portal: z.enum(['active', 'invited', 'not_invited', 'all']).optional().default('all'),
  attention: z.enum(['true', 'false']).optional(),
  sort: z.enum(['name', 'created_at', 'progress']).optional().default('name'),
});
export type ClientQueryType = z.infer<typeof ClientQuerySchema>;

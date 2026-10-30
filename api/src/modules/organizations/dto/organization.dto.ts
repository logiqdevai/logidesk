import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ExpirationPolicy, FileFormat, PortalAccessMode } from 'generated/prisma';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);
const trimOrNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Meridian Accounting' })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Workspace name must be at least 2 characters' })
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Europe/Athens' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  time_zone?: string;
}

export class UpdateOrganizationDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @Transform(trimOrNull) @ValidateIf((o) => o.contact_email !== null) @IsEmail() contact_email?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(40) contact_phone?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(300) address?: string | null;
  @IsOptional() @IsString() @MaxLength(60) time_zone?: string;
  @IsOptional() @IsString() @MaxLength(10) default_language?: string;
}

export class UpdatePortalSettingsDto {
  @ApiPropertyOptional({ enum: PortalAccessMode })
  @IsOptional()
  @IsEnum(PortalAccessMode)
  access_mode?: PortalAccessMode;

  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(2000) welcome_message?: string | null;
  @IsOptional() @ValidateIf((o) => o.accent_color !== null) @Matches(/^#[0-9a-fA-F]{6}$/) accent_color?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(60) invitation_validity_days?: number;
  @IsOptional() @IsBoolean() invite_on_first_assignment?: boolean;
  @IsOptional() @IsBoolean() require_email_verification?: boolean;
  @ApiPropertyOptional({ description: 'Generate a new public link (the old one stops working)' })
  @IsOptional()
  @IsBoolean()
  regenerate_public_link?: boolean;
}

export class UpdateDocumentSettingsDto {
  @IsOptional() @IsInt() @Min(1) @Max(100) default_max_upload_mb?: number;
  @IsOptional() @IsArray() @ArrayMinSize(1) @IsEnum(FileFormat, { each: true }) accepted_formats?: FileFormat[];
  @IsOptional() @IsEnum(ExpirationPolicy) default_expiration_policy?: ExpirationPolicy;
  @IsOptional() @ValidateIf((o) => o.default_expiration_days !== null) @IsInt() @Min(1) @Max(3650) default_expiration_days?: number | null;
  @IsOptional() @IsBoolean() require_approval_by_default?: boolean;
}

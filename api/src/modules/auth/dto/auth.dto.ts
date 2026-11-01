import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

const lower = ({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @ApiProperty({ example: 'Alex' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  first_name: string;

  @ApiProperty({ example: 'Morgan' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  last_name: string;

  @ApiProperty({ example: 'alex@example.com' })
  @Transform(lower)
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: '+30 690 000 0000' })
  @Transform(trim)
  @Matches(/^\+?[0-9\s().-]{6,20}$/, { message: 'Enter a valid telephone number' })
  phone: string;

  @ApiProperty({ example: 'GR', description: 'ISO 3166-1 alpha-2 country code' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/, { message: 'Select a valid country' })
  country: string;
}

export class LoginDto {
  @ApiProperty()
  @Transform(lower)
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  refresh_token: string;
}

export class SwitchContextDto {
  @ApiPropertyOptional({ description: 'Workspace to open' })
  @ValidateIf((o) => !o.client_user_id)
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({ description: 'Client portal to open' })
  @ValidateIf((o) => !o.organization_id)
  @IsUUID()
  client_user_id?: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @Transform(lower)
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  token: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ enum: ['en', 'el'] })
  @IsOptional()
  @IsIn(['en', 'el'])
  language?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  current_password: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  new_password: string;
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  token: string;
}

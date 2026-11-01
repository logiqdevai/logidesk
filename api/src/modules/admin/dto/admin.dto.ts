import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { OrganizationRole } from 'generated/prisma';

/** SUPER_ADMIN is never granted through an invitation. */
export const INVITABLE_ACCOUNT_ROLES = ['USER', 'SUPPORT', 'ADMIN'] as const;
export const ACCOUNT_ROLE_FILTERS = ['USER', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT'] as const;

export class ListUsersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: 'Only users who are members of this workspace' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({ enum: OrganizationRole, description: 'Only users holding this role in any (or the selected) workspace' })
  @IsOptional()
  @IsEnum(OrganizationRole)
  workspace_role?: OrganizationRole;

  @ApiPropertyOptional({ enum: ACCOUNT_ROLE_FILTERS })
  @IsOptional()
  @IsIn(ACCOUNT_ROLE_FILTERS)
  account_role?: (typeof ACCOUNT_ROLE_FILTERS)[number];

  @ApiPropertyOptional({ enum: ['verified', 'unverified'] })
  @IsOptional()
  @IsIn(['verified', 'unverified'])
  verification?: 'verified' | 'unverified';

  @ApiPropertyOptional({ enum: ['workspace', 'portal', 'none'], description: 'Workspace member, client-portal user, or neither' })
  @IsOptional()
  @IsIn(['workspace', 'portal', 'none'])
  access?: 'workspace' | 'portal' | 'none';

  @ApiPropertyOptional({ enum: ['7', '30', '90', 'never'], description: 'Last login within N days, or never logged in' })
  @IsOptional()
  @IsIn(['7', '30', '90', 'never'])
  last_login?: '7' | '30' | '90' | 'never';

  @ApiPropertyOptional({ enum: ['7', '30', '90'], description: 'Joined within the last N days' })
  @IsOptional()
  @IsIn(['7', '30', '90'])
  joined?: '7' | '30' | '90';
}

export class AdminInviteUserDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiProperty({ enum: INVITABLE_ACCOUNT_ROLES, description: 'Platform account role granted when the invitation is accepted' })
  @IsIn(INVITABLE_ACCOUNT_ROLES)
  role: (typeof INVITABLE_ACCOUNT_ROLES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

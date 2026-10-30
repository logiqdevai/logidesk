import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrganizationRole } from 'generated/prisma';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { TeamService } from './team.service';

export class InviteMemberDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiProperty({ enum: OrganizationRole })
  @IsEnum(OrganizationRole)
  role: OrganizationRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class ChangeRoleDto {
  @ApiProperty({ enum: OrganizationRole })
  @IsEnum(OrganizationRole)
  role: OrganizationRole;
}

@ApiTags('Team')
@ApiBearerAuth()
@Controller('team')
@UseGuards(WorkspaceGuard)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  @RequirePermissions(Permission.TEAM_VIEW)
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.team.list(ws);
  }

  @Post('invitations')
  @RequirePermissions(Permission.TEAM_MANAGE)
  invite(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: InviteMemberDto) {
    return this.team.invite(ws, dto);
  }

  @Post('invitations/:id/resend')
  @HttpCode(200)
  @RequirePermissions(Permission.TEAM_MANAGE)
  resend(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.resend(ws, id);
  }

  @Delete('invitations/:id')
  @RequirePermissions(Permission.TEAM_MANAGE)
  revoke(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.revoke(ws, id);
  }

  @Patch('members/:id/role')
  @RequirePermissions(Permission.TEAM_MANAGE)
  changeRole(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeRoleDto) {
    return this.team.changeRole(ws, id, dto.role);
  }

  @Delete('members/:id')
  @RequirePermissions(Permission.TEAM_MANAGE)
  remove(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.remove(ws, id);
  }
}

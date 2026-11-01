import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAccount } from '@/shared/auth/decorators/context.decorators';
import { PlatformAdminGuard } from '@/shared/auth/guards/platform-admin.guard';
import { AccountContext } from '@/shared/auth/interfaces/auth-context.interface';
import { AdminService } from './admin.service';
import { AdminInviteUserDto, ListUsersQueryDto } from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'All users with their workspaces, pending invitations and workspace options' })
  users(@Query() query: ListUsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Post('invitations')
  @ApiOperation({ summary: 'Invite a person to the platform with an account role (registration is invitation-only)' })
  invite(@CurrentAccount() account: AccountContext, @Body() dto: AdminInviteUserDto) {
    return this.admin.inviteUser(account.user_id, dto);
  }
}

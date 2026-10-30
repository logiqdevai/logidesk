import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { Permission } from '@/shared/auth/permissions';
import { ActivityService } from '@/modules/activity/activity.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller()
@UseGuards(WorkspaceGuard)
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly activity: ActivityService,
    private readonly access: ClientAccessService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Statistics, collection progress, clients needing attention, recent activity' })
  overview(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.dashboard.overview(ws);
  }

  @Get('activity')
  @RequirePermissions(Permission.AUDIT_VIEW)
  @ApiOperation({ summary: 'Organization audit trail (read-only)' })
  audit(@CurrentWorkspace() ws: WorkspaceContext, @Query('before') before?: string, @Query('client_id') clientId?: string) {
    return this.activity.list(ws.organization_id, {
      limit: 100,
      before: before ? new Date(before) : undefined,
      clientId: clientId || undefined,
    });
  }
}

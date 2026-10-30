import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { NotificationAdminService } from './services/notification-admin.service';
import { NotificationsService } from './services/notifications.service';
import { RemindersService } from './services/reminders.service';
import {
  BulkReminderDto,
  CreateTemplateDto,
  NotificationQuerySchema,
  NotificationQueryType,
  ReminderPreviewDto,
  SendReminderDto,
  UpdateNotificationSettingsDto,
  UpdateTemplateDto,
} from './dto/notifications.dto';

@ApiTags('Notifications & reminders')
@ApiBearerAuth()
@Controller()
@UseGuards(WorkspaceGuard)
export class NotificationsController {
  constructor(
    private readonly admin: NotificationAdminService,
    private readonly notifications: NotificationsService,
    private readonly reminders: RemindersService,
  ) {}

  @Get('notifications')
  @RequirePermissions(Permission.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Notification history' })
  history(@CurrentWorkspace() ws: WorkspaceContext, @Query(new ZodValidationPipe(NotificationQuerySchema)) query: NotificationQueryType) {
    return this.admin.history(ws, query);
  }

  @Get('notifications/settings')
  @RequirePermissions(Permission.NOTIFICATIONS_VIEW)
  settings(@CurrentWorkspace('organization_id') orgId: string) {
    return this.admin.settings(orgId);
  }

  @Patch('notifications/settings')
  @RequirePermissions(Permission.NOTIFICATIONS_MANAGE)
  updateSettings(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: UpdateNotificationSettingsDto) {
    return this.admin.updateSettings(ws, dto);
  }

  @Get('notifications/templates')
  @RequirePermissions(Permission.NOTIFICATIONS_VIEW)
  templates(@CurrentWorkspace('organization_id') orgId: string) {
    return this.admin.templates(orgId);
  }

  @Post('notifications/templates')
  @RequirePermissions(Permission.NOTIFICATIONS_MANAGE)
  createTemplate(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: CreateTemplateDto) {
    return this.admin.createTemplate(ws, dto);
  }

  @Patch('notifications/templates/:id')
  @RequirePermissions(Permission.NOTIFICATIONS_MANAGE)
  updateTemplate(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateDto) {
    return this.admin.updateTemplate(ws, id, dto);
  }

  @Delete('notifications/templates/:id')
  @RequirePermissions(Permission.NOTIFICATIONS_MANAGE)
  deleteTemplate(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteTemplate(ws, id);
  }

  @Get('notifications/:id')
  @RequirePermissions(Permission.NOTIFICATIONS_VIEW)
  detail(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.detail(ws, id);
  }

  @Post('notifications/:id/retry')
  @HttpCode(200)
  @RequirePermissions(Permission.REMINDERS_SEND)
  @ApiOperation({ summary: 'Re-enqueue delivery (trigger: Manual retry)' })
  async retry(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    await this.notifications.retry(ws.organization_id, id, ws.user_id);
    return this.admin.detail(ws, id);
  }

  @Post('reminders/preview')
  @HttpCode(200)
  @RequirePermissions(Permission.REMINDERS_SEND)
  @ApiOperation({ summary: 'Recipient, outstanding documents and message preview' })
  preview(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: ReminderPreviewDto) {
    return this.reminders.preview(ws, dto.client_id, dto.assignment_id);
  }

  @Post('reminders/send')
  @HttpCode(200)
  @RequirePermissions(Permission.REMINDERS_SEND)
  @ApiOperation({ summary: 'Send a manual reminder (queued; returns immediately)' })
  send(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: SendReminderDto) {
    return this.reminders.sendManual(ws, dto);
  }

  @Post('reminders/bulk')
  @HttpCode(200)
  @RequirePermissions(Permission.REMINDERS_SEND)
  bulk(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: BulkReminderDto) {
    return this.reminders.sendBulk(ws, dto.client_ids);
  }
}

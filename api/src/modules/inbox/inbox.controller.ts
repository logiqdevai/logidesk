import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { InboxService } from './inbox.service';
import { InboxQuerySchema, InboxQueryType, ResolveInboxItemDto } from './dto/inbox.dto';

@ApiTags('Document Inbox')
@ApiBearerAuth()
@Controller('inbox')
@UseGuards(WorkspaceGuard)
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get()
  @ApiOperation({ summary: 'Unified inbox of incoming documents (all sources)' })
  list(@CurrentWorkspace() ws: WorkspaceContext, @Query(new ZodValidationPipe(InboxQuerySchema)) query: InboxQueryType) {
    return this.inbox.list(ws, query);
  }

  @Get('counts')
  @ApiOperation({ summary: 'Needs-review badge count' })
  counts(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.inbox.counts(ws);
  }

  @Get('clients/:clientId/requirements')
  requirements(@CurrentWorkspace() ws: WorkspaceContext, @Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.inbox.requirementsForClient(ws, clientId);
  }

  @Get(':id')
  get(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.get(ws, id);
  }

  @Post(':id/resolve')
  @HttpCode(200)
  @RequirePermissions(Permission.DOCUMENTS_REVIEW)
  @ApiOperation({ summary: 'Approve, reject, confirm or change the match, or dismiss' })
  resolve(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveInboxItemDto) {
    return this.inbox.resolve(ws, id, dto);
  }
}

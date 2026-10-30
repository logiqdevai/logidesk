import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ClientsService } from './clients.service';
import { ClientQuerySchema, ClientQueryType, CreateClientDto, CreateNoteDto, SetAssigneesDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(WorkspaceGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List clients (Members only see their assigned clients)' })
  list(@CurrentWorkspace() ws: WorkspaceContext, @Query(new ZodValidationPipe(ClientQuerySchema)) query: ClientQueryType) {
    return this.clients.list(ws, query);
  }

  @Post()
  @RequirePermissions(Permission.CLIENTS_CREATE)
  create(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: CreateClientDto) {
    return this.clients.create(ws, dto);
  }

  @Get(':id')
  get(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.get(ws, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CLIENTS_MANAGE)
  update(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(ws, id, dto);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermissions(Permission.CLIENTS_ARCHIVE)
  archive(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.setArchived(ws, id, true);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequirePermissions(Permission.CLIENTS_ARCHIVE)
  restore(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.setArchived(ws, id, false);
  }

  @Patch(':id/assignees')
  @RequirePermissions(Permission.CLIENTS_ASSIGN_EMPLOYEES)
  setAssignees(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetAssigneesDto) {
    return this.clients.setAssignees(ws, id, dto.member_ids);
  }

  @Get(':id/notes')
  notes(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.listNotes(ws, id);
  }

  @Post(':id/notes')
  addNote(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateNoteDto) {
    return this.clients.addNote(ws, id, dto.body);
  }

  @Delete(':id/notes/:noteId')
  deleteNote(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    return this.clients.deleteNote(ws, id, noteId);
  }

  @Get(':id/activity')
  activity(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.activityFor(ws, id);
  }

  @Post(':id/portal-invitation')
  @HttpCode(200)
  @RequirePermissions(Permission.CLIENTS_MANAGE)
  invite(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.invitePortal(ws, id);
  }
}

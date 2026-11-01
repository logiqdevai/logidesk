import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ClientsService } from './clients.service';
import { ClientImportService } from './client-import.service';
import { ImportClientsDto, InviteImportedClientsDto } from './dto/client-import.dto';
import { CLIENT_IMPORT_MAX_BYTES } from './utils/client-import.utils';
import { ClientQuerySchema, ClientQueryType, CreateClientDto, CreateNoteDto, SetAssigneesDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(WorkspaceGuard)
export class ClientsController {
  constructor(
    private readonly clients: ClientsService,
    private readonly importer: ClientImportService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List clients (Members only see their assigned clients)' })
  list(@CurrentWorkspace() ws: WorkspaceContext, @Query(new ZodValidationPipe(ClientQuerySchema)) query: ClientQueryType) {
    return this.clients.list(ws, query);
  }

  @Post('import/preview')
  @HttpCode(200)
  @RequirePermissions(Permission.CLIENTS_CREATE)
  @ApiOperation({ summary: 'Read an uploaded Excel/CSV file: detect its columns and suggest a mapping to client fields' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CLIENT_IMPORT_MAX_BYTES } }))
  previewImport(@UploadedFile() file: Express.Multer.File) {
    return this.importer.preview(file);
  }

  @Post('import')
  @HttpCode(200)
  @RequirePermissions(Permission.CLIENTS_CREATE)
  @ApiOperation({ summary: 'Create clients from an uploaded Excel/CSV file using a column mapping' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CLIENT_IMPORT_MAX_BYTES } }))
  importClients(@CurrentWorkspace() ws: WorkspaceContext, @UploadedFile() file: Express.Multer.File, @Body() dto: ImportClientsDto) {
    return this.importer.import(ws, file, dto);
  }

  @Post('import/invitations')
  @HttpCode(200)
  @RequirePermissions(Permission.CLIENTS_MANAGE)
  @ApiOperation({ summary: 'Send the portal invitation to clients (e.g. the ones just imported)' })
  inviteImported(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: InviteImportedClientsDto) {
    return this.importer.inviteClients(ws, dto.client_ids);
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

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a client (Owner and Admin only)' })
  @RequirePermissions(Permission.CLIENTS_DELETE)
  remove(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.remove(ws, id);
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

  @Post(':id/portal-disable')
  @HttpCode(200)
  @RequirePermissions(Permission.CLIENTS_MANAGE)
  @ApiOperation({ summary: 'Disable the client portal: blocks login, ends sessions, cancels pending invitations' })
  disablePortal(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.setPortalDisabled(ws, id, true);
  }

  @Post(':id/portal-enable')
  @HttpCode(200)
  @RequirePermissions(Permission.CLIENTS_MANAGE)
  @ApiOperation({ summary: 'Re-enable a disabled client portal' })
  enablePortal(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.setPortalDisabled(ws, id, false);
  }
}

import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { ClientIp, CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { AssignmentsService } from './services/assignments.service';
import { CreateAssignmentDto, SaveAnswersDto, UpdateAssignmentDto, UpdateRequirementDto } from './dto/assignment.dto';

@ApiTags('Form assignments')
@ApiBearerAuth()
@Controller('assignments')
@UseGuards(WorkspaceGuard)
export class AssignmentsController {
  constructor(
    private readonly assignments: AssignmentsService,
    private readonly access: ClientAccessService,
  ) {}

  @Post()
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  @ApiOperation({ summary: 'Assign one or more forms to a client (pinned to the latest version)' })
  create(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: CreateAssignmentDto) {
    return this.assignments.create(ws, dto);
  }

  @Get('client/:clientId')
  forClient(@CurrentWorkspace() ws: WorkspaceContext, @Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.assignments.listForClient(ws, clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Client form view: answers, requirements, documents and recent changes' })
  get(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.getForWorkspace(ws, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  update(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignments.update(ws, id, dto);
  }

  @Patch(':id/answers')
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  @ApiOperation({ summary: 'Edit answers on behalf of the client (audited)' })
  async saveAnswers(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAnswersDto,
    @ClientIp() ip: string,
  ) {
    await this.access.assertAssignment(ws, id);
    await this.assignments.saveAnswers(ws.organization_id, id, dto, { userId: ws.user_id }, ip);
    return this.assignments.getForWorkspace(ws, id);
  }

  @Patch(':id/requirements/:requirementId')
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  updateRequirement(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.assignments.updateRequirement(ws, id, requirementId, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  cancel(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.cancel(ws, id);
  }
}

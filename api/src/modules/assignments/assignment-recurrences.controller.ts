import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { AssignmentRecurrencesService } from './services/assignment-recurrences.service';
import { PreviewRecurrenceDto, UpdateRecurrenceDto } from './dto/recurrence.dto';
import { AssignmentRecurrenceQuerySchema, AssignmentRecurrenceQueryType } from './dto/assignment-recurrence-query.schema';

@ApiTags('Recurring assignments')
@ApiBearerAuth()
@Controller('assignment-recurrences')
@UseGuards(WorkspaceGuard)
export class AssignmentRecurrencesController {
  constructor(private readonly recurrences: AssignmentRecurrencesService) {}

  @Get()
  @ApiOperation({ summary: 'Recurring assignment series (filter by client, form or status)' })
  list(@CurrentWorkspace() ws: WorkspaceContext, @Query(new ZodValidationPipe(AssignmentRecurrenceQuerySchema)) query: AssignmentRecurrenceQueryType) {
    return this.recurrences.list(ws, query);
  }

  @Post('preview')
  @HttpCode(200)
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  @ApiOperation({ summary: 'Next occurrences and deadlines of a schedule that has not been saved yet' })
  preview(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: PreviewRecurrenceDto) {
    return this.recurrences.preview(ws, dto);
  }

  @Get(':id')
  get(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.recurrences.get(ws, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  @ApiOperation({ summary: 'Edit a series; applies to assignments created from now on' })
  update(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecurrenceDto) {
    return this.recurrences.update(ws, id, dto);
  }

  @Post(':id/pause')
  @HttpCode(200)
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  pause(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.recurrences.pause(ws, id);
  }

  @Post(':id/resume')
  @HttpCode(200)
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  resume(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.recurrences.resume(ws, id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.ASSIGNMENTS_MANAGE)
  @ApiOperation({ summary: 'End the series (assignments already created are kept)' })
  end(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.recurrences.end(ws, id);
  }
}

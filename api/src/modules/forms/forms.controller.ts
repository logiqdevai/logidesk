import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ExportsService } from '@/modules/exports/exports.service';
import { FormsService } from './services/forms.service';
import { FormSubmissionsService } from './services/form-submissions.service';
import {
  CreateFormDto,
  DuplicateFormDto,
  FormQuerySchema,
  FormQueryType,
  SubmissionsQuerySchema,
  SubmissionsQueryType,
  UpdateFormDto,
} from './dto/form.dto';

@ApiTags('Forms & templates')
@ApiBearerAuth()
@Controller('forms')
@UseGuards(WorkspaceGuard)
export class FormsController {
  constructor(
    private readonly forms: FormsService,
    private readonly submissions: FormSubmissionsService,
    private readonly exports: ExportsService,
  ) {}

  @Get()
  @RequirePermissions(Permission.FORMS_VIEW)
  list(@CurrentWorkspace('organization_id') orgId: string, @Query(new ZodValidationPipe(FormQuerySchema)) query: FormQueryType) {
    return this.forms.list(orgId, query);
  }

  @Post()
  @RequirePermissions(Permission.FORMS_MANAGE)
  create(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: CreateFormDto) {
    return this.forms.create(ws, dto);
  }

  @Get(':id')
  @RequirePermissions(Permission.FORMS_VIEW)
  @ApiOperation({ summary: 'Latest version of the form (builder / preview)' })
  get(@CurrentWorkspace('organization_id') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.forms.get(orgId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.FORMS_MANAGE)
  @ApiOperation({ summary: 'Save the builder (published forms get a new immutable version)' })
  update(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFormDto) {
    return this.forms.update(ws, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @RequirePermissions(Permission.FORMS_MANAGE)
  publish(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.forms.publish(ws, id);
  }

  @Post(':id/duplicate')
  @RequirePermissions(Permission.FORMS_MANAGE)
  duplicate(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DuplicateFormDto) {
    return this.forms.duplicate(ws, id, dto);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermissions(Permission.FORMS_MANAGE)
  archive(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.forms.setArchived(ws, id, true);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequirePermissions(Permission.FORMS_MANAGE)
  restore(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.forms.setArchived(ws, id, false);
  }

  @Get(':id/submissions')
  @RequirePermissions(Permission.FORMS_VIEW)
  @ApiOperation({ summary: 'Every client the form was assigned to, with summary counts' })
  listSubmissions(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(SubmissionsQuerySchema)) query: SubmissionsQueryType,
  ) {
    return this.submissions.list(ws, id, query);
  }

  @Post(':id/submissions/export')
  @RequirePermissions(Permission.FORMS_VIEW)
  @ApiOperation({ summary: 'CSV export of the filtered list (EXPORTS queue)' })
  exportSubmissions(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(SubmissionsQuerySchema)) query: SubmissionsQueryType,
  ) {
    return this.exports.requestSubmissionsCsv(ws, id, query);
  }
}

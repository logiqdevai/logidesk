import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { Permission } from '@/shared/auth/permissions';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { optionalString, PaginationQuerySchema } from '@/shared/utils/pagination/pagination.utils';
import { JobQuery, JobsQueryService } from './jobs-query.service';

const JobQuerySchema = PaginationQuerySchema.extend({
  queue: optionalString,
  status: optionalString,
  job_name: optionalString,
  entity_type: optionalString,
  entity_id: optionalString,
  worker_id: optionalString,
});

@ApiTags('Background jobs')
@ApiBearerAuth()
@Controller('jobs')
@UseGuards(WorkspaceGuard)
@RequirePermissions(Permission.JOBS_VIEW)
export class JobsController {
  constructor(private readonly jobs: JobsQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Query job_runs by queue, status, job name, entity and worker' })
  list(@CurrentWorkspace('organization_id') orgId: string, @Query(new ZodValidationPipe(JobQuerySchema)) q: z.infer<typeof JobQuerySchema>) {
    return this.jobs.list(orgId, q as JobQuery);
  }

  @Get(':id')
  get(@CurrentWorkspace('organization_id') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.get(orgId, id);
  }
}

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { ExportsService } from './exports.service';

@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
@UseGuards(WorkspaceGuard)
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get(':exportId')
  @ApiOperation({ summary: 'Export progress; includes a short-lived download URL once ready' })
  status(@CurrentWorkspace() ws: WorkspaceContext, @Param('exportId') exportId: string) {
    return this.exports.status(ws, exportId);
  }
}

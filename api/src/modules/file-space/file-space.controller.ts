import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { z } from 'zod';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { optionalString } from '@/shared/utils/pagination/pagination.utils';
import { ExportsService } from '@/modules/exports/exports.service';
import { FileSpaceService } from './file-space.service';

const FolderQuerySchema = z.object({
  client_id: optionalString,
  assignment_id: optionalString,
  search: optionalString,
  file_format: z.enum(['PDF', 'IMAGE', 'WORD', 'EXCEL', 'all']).optional().transform((v) => (v === 'all' ? undefined : v)),
});

class ZipRequestDto {
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsUUID()
  assignment_id?: string;
}

@ApiTags('File Space')
@ApiBearerAuth()
@Controller('file-space')
@UseGuards(WorkspaceGuard)
export class FileSpaceController {
  constructor(
    private readonly fileSpace: FileSpaceService,
    private readonly exports: ExportsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Browse folders (Client > Form > files)' })
  browse(@CurrentWorkspace() ws: WorkspaceContext, @Query(new ZodValidationPipe(FolderQuerySchema)) query: any) {
    return this.fileSpace.browse(ws, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Storage used vs. plan allowance, file count and breakdown by type' })
  summary(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.fileSpace.summary(ws);
  }

  @Post('zip')
  @ApiOperation({ summary: 'Download a folder as .zip (built on the EXPORTS queue)' })
  zip(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: ZipRequestDto) {
    return this.exports.requestZip(ws, dto);
  }
}

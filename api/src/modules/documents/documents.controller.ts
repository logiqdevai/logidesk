import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadSource } from 'generated/prisma';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { ClientIp, CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { DocumentsService } from './services/documents.service';
import { DocumentIntakeService } from './services/document-intake.service';
import { UPLOAD_LIMITS } from './utils/file-validation.utils';
import {
  DocumentQuerySchema,
  DocumentQueryType,
  ReviewDocumentDto,
  SignedUrlQueryDto,
  UpdateDocumentDto,
  UploadDocumentDto,
} from './dto/document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(WorkspaceGuard)
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly intake: DocumentIntakeService,
    private readonly access: ClientAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Expected documents with their current submission (filterable)' })
  list(@CurrentWorkspace() ws: WorkspaceContext, @Query(new ZodValidationPipe(DocumentQuerySchema)) query: DocumentQueryType) {
    return this.documents.list(ws, query);
  }

  @Post('upload')
  @RequirePermissions(Permission.DOCUMENTS_UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload files for a client requirement (on the client’s behalf)' })
  @UseInterceptors(FilesInterceptor('files', UPLOAD_LIMITS.files, { limits: UPLOAD_LIMITS }))
  async upload(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Body() dto: UploadDocumentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @ClientIp() ip: string,
  ) {
    await this.access.assertRequirement(ws, dto.assignment_requirement_id);
    const docs = await this.intake.submitToRequirement({
      organizationId: ws.organization_id,
      assignmentRequirementId: dto.assignment_requirement_id,
      files: files ?? [],
      source: UploadSource.EMPLOYEE_UPLOAD,
      actor: { userId: ws.user_id },
      expirationDate: dto.expiration_date || null,
      notes: dto.notes,
      ip,
    });
    return { documents: docs.map((d) => ({ id: d.id, original_filename: d.original_filename })) };
  }

  @Get(':id')
  get(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.get(ws, id);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Short-lived signed URL for preview (inline) or download' })
  url(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Query() query: SignedUrlQueryDto) {
    return this.documents.signedUrl(ws, id, query.disposition ?? 'attachment');
  }

  @Patch(':id')
  @RequirePermissions(Permission.DOCUMENTS_UPLOAD)
  update(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentDto) {
    return this.documents.update(ws, id, dto);
  }

  @Post(':id/review')
  @HttpCode(200)
  @RequirePermissions(Permission.DOCUMENTS_REVIEW)
  review(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewDocumentDto) {
    return this.documents.review(ws, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DOCUMENTS_DELETE)
  remove(@CurrentWorkspace() ws: WorkspaceContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.remove(ws, id);
  }
}

import {
  Body,
  Controller,
  Get,
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
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PortalGuard } from '@/shared/auth/guards/portal.guard';
import { ClientIp, CurrentPortal } from '@/shared/auth/decorators/context.decorators';
import { PortalContext } from '@/shared/auth/interfaces/auth-context.interface';
import { SaveAnswersDto } from '@/modules/assignments/dto/assignment.dto';
import { SignedUrlQueryDto } from '@/modules/documents/dto/document.dto';
import { UPLOAD_LIMITS } from '@/modules/documents/utils/file-validation.utils';
import { PortalService } from './portal.service';

class PortalAccountDto {
  @IsOptional() @IsBoolean() notify_reminders?: boolean;
  @IsOptional() @IsBoolean() notify_review_updates?: boolean;
}

const trimOrNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);

class PortalInformationDto {
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(300) address?: string | null;
}

@ApiTags('Client portal')
@ApiBearerAuth()
@Controller('portal')
@UseGuards(PortalGuard)
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('me')
  me(@CurrentPortal() ctx: PortalContext) {
    return this.portal.me(ctx);
  }

  @Get('overview')
  overview(@CurrentPortal() ctx: PortalContext) {
    return this.portal.overview(ctx);
  }

  @Get('forms')
  forms(@CurrentPortal() ctx: PortalContext) {
    return this.portal.listForms(ctx);
  }

  @Get('forms/:id')
  form(@CurrentPortal() ctx: PortalContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.form(ctx, id);
  }

  @Patch('forms/:id/answers')
  saveAnswers(
    @CurrentPortal() ctx: PortalContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAnswersDto,
    @ClientIp() ip: string,
  ) {
    return this.portal.saveAnswers(ctx, id, dto, ip);
  }

  @Post('forms/:id/requirements/:requirementId/upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', UPLOAD_LIMITS.files, { limits: UPLOAD_LIMITS }))
  upload(
    @CurrentPortal() ctx: PortalContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @ClientIp() ip: string,
  ) {
    return this.portal.upload(ctx, id, requirementId, files ?? [], ip);
  }

  @Get('documents')
  documents(@CurrentPortal() ctx: PortalContext) {
    return this.portal.documents(ctx);
  }

  @Get('documents/:id/url')
  documentUrl(@CurrentPortal() ctx: PortalContext, @Param('id', ParseUUIDPipe) id: string, @Query() query: SignedUrlQueryDto) {
    return this.portal.documentUrl(ctx, id, query.disposition ?? 'attachment');
  }

  @Patch('account')
  updateAccount(@CurrentPortal() ctx: PortalContext, @Body() dto: PortalAccountDto) {
    return this.portal.updateAccount(ctx, dto);
  }

  @Patch('information')
  updateInformation(@CurrentPortal() ctx: PortalContext, @Body() dto: PortalInformationDto) {
    return this.portal.updateInformation(ctx, dto);
  }
}

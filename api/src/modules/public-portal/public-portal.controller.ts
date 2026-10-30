import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ClientIp } from '@/shared/auth/decorators/context.decorators';
import { RateLimit, RateLimitGuard } from '@/shared/security/rate-limit.guard';
import { UPLOAD_LIMITS } from '@/modules/documents/utils/file-validation.utils';
import { PublicPortalService } from './public-portal.service';

@ApiTags('Public portal')
@Controller('public/portal')
@UseGuards(RateLimitGuard)
export class PublicPortalController {
  constructor(private readonly publicPortal: PublicPortalService) {}

  @Get(':slug')
  @RateLimit({ name: 'public-portal', limit: 120, windowSeconds: 600 })
  overview(@Param('slug') slug: string) {
    return this.publicPortal.overview(slug);
  }

  @Get(':slug/forms/:formId')
  @RateLimit({ name: 'public-portal', limit: 120, windowSeconds: 600 })
  form(@Param('slug') slug: string, @Param('formId', ParseUUIDPipe) formId: string) {
    return this.publicPortal.form(slug, formId);
  }

  @Post(':slug/forms/:formId/submit')
  @ApiConsumes('multipart/form-data')
  @RateLimit({ name: 'public-submit', limit: 10, windowSeconds: 3600 })
  @UseInterceptors(AnyFilesInterceptor({ limits: UPLOAD_LIMITS }))
  submit(
    @Param('slug') slug: string,
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
    @ClientIp() ip: string,
  ) {
    return this.publicPortal.submit(slug, formId, body, files ?? [], ip);
  }
}

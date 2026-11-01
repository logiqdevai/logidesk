import { Body, Controller, Delete, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountGuard } from '@/shared/auth/guards/account.guard';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentAccount, CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { RequirePermissions } from '@/shared/auth/decorators/require-permissions.decorator';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { RateLimit, RateLimitGuard } from '@/shared/security/rate-limit.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateDocumentSettingsDto, UpdateOrganizationDto, UpdatePortalSettingsDto } from './dto/organization.dto';

@ApiTags('Workspaces & settings')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  @UseGuards(AccountGuard, RateLimitGuard)
  @RateLimit({ name: 'create-workspace', limit: 10, windowSeconds: 3600 })
  @ApiOperation({ summary: 'Create a workspace (the creator becomes its Owner)' })
  create(@CurrentAccount('user_id') userId: string, @Body() dto: CreateOrganizationDto) {
    return this.organizations.create(userId, dto);
  }

  @Get('current')
  @UseGuards(WorkspaceGuard)
  current(@CurrentWorkspace('organization_id') orgId: string) {
    return this.organizations.get(orgId);
  }

  @Patch('current')
  @UseGuards(WorkspaceGuard)
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  update(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: UpdateOrganizationDto) {
    return this.organizations.update(ws, dto);
  }

  @Post('current/logo')
  @UseGuards(WorkspaceGuard)
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadLogo(@CurrentWorkspace() ws: WorkspaceContext, @UploadedFile() file: Express.Multer.File) {
    return this.organizations.uploadLogo(ws, file);
  }

  @Delete('current/logo')
  @UseGuards(WorkspaceGuard)
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  removeLogo(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.organizations.removeLogo(ws);
  }

  @Patch('current/portal')
  @UseGuards(WorkspaceGuard)
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  updatePortal(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: UpdatePortalSettingsDto) {
    return this.organizations.updatePortal(ws, dto);
  }

  @Patch('current/documents')
  @UseGuards(WorkspaceGuard)
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  updateDocuments(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: UpdateDocumentSettingsDto) {
    return this.organizations.updateDocuments(ws, dto);
  }
}

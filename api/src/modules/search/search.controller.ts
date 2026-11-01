import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '@/shared/auth/guards/workspace.guard';
import { CurrentWorkspace } from '@/shared/auth/decorators/context.decorators';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { SearchQuerySchema, SearchQueryType } from './dto/search-query.schema';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
@UseGuards(WorkspaceGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across clients, forms, assignments, documents and members — by text or full UUID' })
  find(@CurrentWorkspace() ws: WorkspaceContext, @Query(new ZodValidationPipe(SearchQuerySchema)) query: SearchQueryType) {
    return this.search.search(ws, query.q, query.limit);
  }
}

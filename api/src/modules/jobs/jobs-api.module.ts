import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsQueryService } from './jobs-query.service';

@Module({
  controllers: [JobsController],
  providers: [JobsQueryService],
  exports: [JobsQueryService],
})
export class JobsApiModule {}

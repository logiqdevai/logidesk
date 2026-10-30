import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../databases/prisma/prisma.module';
import { QueuesModule } from '../queues/queues.module';
import { JobsService } from './jobs.service';
import { JobRunnerService } from './job-runner.service';

@Global()
@Module({
  imports: [PrismaModule, QueuesModule],
  providers: [JobsService, JobRunnerService],
  exports: [JobsService, JobRunnerService],
})
export class JobsModule {}

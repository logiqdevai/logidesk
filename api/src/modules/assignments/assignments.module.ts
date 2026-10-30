import { Global, Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './services/assignments.service';
import { ProgressService } from './services/progress.service';

@Global()
@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService, ProgressService],
  exports: [AssignmentsService, ProgressService],
})
export class AssignmentsModule {}

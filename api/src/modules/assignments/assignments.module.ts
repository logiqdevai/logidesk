import { Global, Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentRecurrencesController } from './assignment-recurrences.controller';
import { AssignmentsService } from './services/assignments.service';
import { AssignmentRecurrencesService } from './services/assignment-recurrences.service';
import { ProgressService } from './services/progress.service';

@Global()
@Module({
  controllers: [AssignmentsController, AssignmentRecurrencesController],
  providers: [AssignmentsService, AssignmentRecurrencesService, ProgressService],
  exports: [AssignmentsService, AssignmentRecurrencesService, ProgressService],
})
export class AssignmentsModule {}

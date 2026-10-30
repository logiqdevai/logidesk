import { Global, Module } from '@nestjs/common';
import { FormsController } from './forms.controller';
import { FormsService } from './services/forms.service';
import { FormSubmissionsService } from './services/form-submissions.service';

@Global()
@Module({
  controllers: [FormsController],
  providers: [FormsService, FormSubmissionsService],
  exports: [FormsService, FormSubmissionsService],
})
export class FormsModule {}

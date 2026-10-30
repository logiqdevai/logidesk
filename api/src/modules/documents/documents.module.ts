import { Global, Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './services/documents.service';
import { DocumentIntakeService } from './services/document-intake.service';
import { DocumentProcessingService } from './services/document-processing.service';

@Global()
@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentIntakeService, DocumentProcessingService],
  exports: [DocumentsService, DocumentIntakeService, DocumentProcessingService],
})
export class DocumentsModule {}

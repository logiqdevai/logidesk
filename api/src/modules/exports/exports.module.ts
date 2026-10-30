import { Global, Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { ExportBuilderService } from './export-builder.service';

@Global()
@Module({
  controllers: [ExportsController],
  providers: [ExportsService, ExportBuilderService],
  exports: [ExportsService, ExportBuilderService],
})
export class ExportsModule {}

import { Module } from '@nestjs/common';
import { FileSpaceController } from './file-space.controller';
import { FileSpaceService } from './file-space.service';

@Module({
  controllers: [FileSpaceController],
  providers: [FileSpaceService],
  exports: [FileSpaceService],
})
export class FileSpaceModule {}

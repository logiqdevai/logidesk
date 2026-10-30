import { Global, Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientPortalAccessService } from './client-portal-access.service';

@Global()
@Module({
  controllers: [ClientsController],
  providers: [ClientsService, ClientPortalAccessService],
  exports: [ClientsService, ClientPortalAccessService],
})
export class ClientsModule {}

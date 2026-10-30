import { Module } from '@nestjs/common';
import { FEATURE_MODULES, INFRASTRUCTURE_MODULES } from './domain.modules';
import { PROCESSORS } from './background/processors/processors';
import { SchedulersService } from './background/schedulers.service';
import { ExpirationService } from './background/services/expiration.service';
import { MaintenanceService } from './background/services/maintenance.service';

/** Dedicated worker process: BullMQ processors + repeatable schedulers. */
@Module({
  imports: [...INFRASTRUCTURE_MODULES, ...FEATURE_MODULES],
  providers: [...PROCESSORS, SchedulersService, ExpirationService, MaintenanceService],
})
export class WorkerModule {}

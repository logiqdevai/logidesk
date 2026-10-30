import { MiddlewareConsumer, Module, NestModule, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@bull-board/express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { BullBoardModule } from './core/queues/bull-board.module';
import { BULL_BOARD_ADAPTER } from './core/queues/queues.constants';
import { bullBoardAuthMiddleware } from './core/queues/bull-board.middleware';
import { FEATURE_MODULES, INFRASTRUCTURE_MODULES } from './domain.modules';

/** HTTP API. It only enqueues background work; processing happens in the worker process. */
@Module({
  imports: [...INFRASTRUCTURE_MODULES, ...FEATURE_MODULES, HealthModule, BullBoardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  constructor(
    @Inject(BULL_BOARD_ADAPTER) private readonly bullBoard: ExpressAdapter,
    private readonly config: ConfigService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(bullBoardAuthMiddleware(this.config), this.bullBoard.getRouter()).forRoutes('/admin/queues');
  }
}

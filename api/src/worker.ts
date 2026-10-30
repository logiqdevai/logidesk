import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

/**
 * Worker entry point (`npm run start:worker`). Runs independently from the API so reminders,
 * notifications and exports keep processing while the web app is idle or redeploying.
 * Shutdown is graceful: workers stop taking jobs and finish the active ones; BullMQ
 * re-delivers anything that stalls.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: ['log', 'warn', 'error'] });
  app.enableShutdownHooks();
  new Logger('Worker').log(`Worker started (pid ${process.pid})`);
}
bootstrap();

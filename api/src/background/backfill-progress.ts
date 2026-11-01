import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ProgressService } from '@/modules/assignments/services/progress.service';
import { WorkerModule } from '../worker.module';

/**
 * One-off: recalculates cached progress for every open assignment so existing forms include
 * required questions in `progress_percent`. Run: `npm run backfill:progress` (uses .env.staging).
 */
async function run() {
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: ['error', 'warn'] });
  const log = new Logger('BackfillProgress');
  const prisma = app.get(PrismaService);
  const progress = app.get(ProgressService);
  const rows = await prisma.formAssignment.findMany({ where: { cancelled_at: null }, select: { id: true } });
  for (const { id } of rows) await progress.recalcAssignment(id);
  log.log(`Recalculated ${rows.length} assignments`);
  await app.close();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});

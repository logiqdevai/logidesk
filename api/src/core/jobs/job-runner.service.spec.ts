// Infrastructure modules are ESM-only / need a database: replace them for this unit test.
jest.mock('../databases/prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => undefined }));
jest.mock('bullmq', () => ({ Queue: class {} }));

import { JobQueue, JobRunStatus, JobTrigger } from 'generated/prisma';
import { JobRunnerService } from './job-runner.service';
import { sanitizePayload } from './jobs.service';

function prismaMock() {
  const rows: any[] = [];
  return {
    rows,
    jobRun: {
      findFirst: jest.fn(async ({ where }) => rows.filter((r) => r.queue === where.queue && r.job_id === where.job_id).sort((a, b) => a.attempt - b.attempt)[0] ?? null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const key = where.queue_job_id_attempt;
        let row = rows.find((r) => r.queue === key.queue && r.job_id === key.job_id && r.attempt === key.attempt);
        if (row) Object.assign(row, update);
        else rows.push((row = { id: `run-${rows.length + 1}`, queued_at: new Date(), wait_ms: null, ...create }));
        return row;
      }),
      update: jest.fn(async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data)),
      create: jest.fn(async ({ data }) => {
        const row = { id: `run-${rows.length + 1}`, queued_at: new Date(), ...data };
        rows.push(row);
        return row;
      }),
      updateMany: jest.fn(),
    },
  };
}

const job = (attemptsMade: number) =>
  ({ id: 'notification-1', name: 'notification.deliver', data: { notification_id: 'n1' }, attemptsMade, opts: { attempts: 2, backoff: { type: 'exponential', delay: 1000 } }, timestamp: Date.now(), updateProgress: jest.fn() }) as any;

describe('JobRunnerService (job_runs persistence)', () => {
  it('records each attempt as its own row; a retry never overwrites the previous attempt', async () => {
    const prisma = prismaMock();
    prisma.rows.push({ id: 'run-0', queue: JobQueue.NOTIFICATIONS, job_id: 'notification-1', attempt: 1, status: JobRunStatus.QUEUED, trigger: JobTrigger.API_REQUEST, queued_at: new Date(), payload: {}, wait_ms: null });
    const runner = new JobRunnerService(prisma as any);

    await expect(runner.run(JobQueue.NOTIFICATIONS, job(0), async () => { throw new Error('provider down'); })).rejects.toThrow('provider down');
    expect(prisma.rows.find((r) => r.attempt === 1).status).toBe(JobRunStatus.RETRYING);
    expect(prisma.rows.find((r) => r.attempt === 2).status).toBe(JobRunStatus.DELAYED);

    await runner.run(JobQueue.NOTIFICATIONS, job(1), async () => ({ ok: true }));
    const second = prisma.rows.find((r) => r.attempt === 2);
    expect(second.status).toBe(JobRunStatus.COMPLETED);
    expect(second.trigger).toBe(JobTrigger.API_REQUEST);
    expect(second.worker_id).toContain(String(process.pid));
    expect(prisma.rows.find((r) => r.attempt === 1).error_message).toBe('provider down');
  });

  it('marks the last attempt as FAILED', async () => {
    const prisma = prismaMock();
    const runner = new JobRunnerService(prisma as any);
    await expect(runner.run(JobQueue.NOTIFICATIONS, job(1), async () => { throw new Error('still down'); })).rejects.toThrow();
    expect(prisma.rows.find((r) => r.attempt === 2).status).toBe(JobRunStatus.FAILED);
    expect(prisma.rows.some((r) => r.attempt === 3)).toBe(false);
  });

  it('never persists secrets or contents in payloads', () => {
    expect(sanitizePayload({ notification_id: 'n1', token: 'abc', body: 'hello', nested: { password: 'x', id: 1 } })).toEqual({ notification_id: 'n1', nested: { id: 1 } });
  });
});

import { Injectable, NotFoundException } from '@nestjs/common';
import { JobQueue, JobRunStatus, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { paginate } from '@/shared/utils/pagination/pagination.utils';

export interface JobQuery {
  page: number;
  limit: number;
  queue?: string;
  status?: string;
  job_name?: string;
  entity_type?: string;
  entity_id?: string;
  worker_id?: string;
}

/** Read access to the durable job history (job_runs) of one organization. */
@Injectable()
export class JobsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, q: JobQuery) {
    const where: Prisma.JobRunWhereInput = {
      organization_id: organizationId,
      ...(q.queue ? { queue: q.queue as JobQueue } : {}),
      ...(q.status ? { status: q.status as JobRunStatus } : {}),
      ...(q.job_name ? { job_name: q.job_name } : {}),
      ...(q.entity_type ? { entity_type: q.entity_type } : {}),
      ...(q.entity_id ? { entity_id: q.entity_id } : {}),
      ...(q.worker_id ? { worker_id: q.worker_id } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.jobRun.findMany({ where, orderBy: { created_at: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.jobRun.count({ where }),
    ]);
    return paginate(rows, total, q.page, q.limit);
  }

  async get(organizationId: string, id: string) {
    const run = await this.prisma.jobRun.findFirst({ where: { id, organization_id: organizationId }, include: { children: true } });
    if (!run) throw new NotFoundException('Job not found');
    return run;
  }
}

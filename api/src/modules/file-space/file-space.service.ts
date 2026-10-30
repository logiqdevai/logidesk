import { Injectable, NotFoundException } from '@nestjs/common';
import { FileFormat, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService, CacheKeys } from '@/core/cache/app-cache.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { DOCUMENT_INCLUDE, mapDocument } from '@/modules/documents/utils/document.mapper';

export interface FolderQuery {
  client_id?: string;
  assignment_id?: string;
  search?: string;
  file_format?: FileFormat;
}

/** File Space: folder view Client > Form > files over the organization's stored documents. */
@Injectable()
export class FileSpaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
    private readonly cache: AppCacheService,
  ) {}

  private docWhere(ws: WorkspaceContext, query: FolderQuery): Prisma.DocumentWhereInput {
    const scope = this.access.viaClient(ws);
    return {
      organization_id: ws.organization_id,
      deleted_at: null,
      client_id: query.client_id ?? { not: null },
      client: { deleted_at: null, ...(scope.client ?? {}) },
      ...(query.assignment_id ? { assignment_id: query.assignment_id } : {}),
      ...(query.file_format ? { file_format: query.file_format } : {}),
    };
  }

  async browse(ws: WorkspaceContext, query: FolderQuery) {
    if (query.assignment_id) return this.files(ws, query);
    if (query.client_id) return this.formFolders(ws, query);
    return this.clientFolders(ws, query);
  }

  private async clientFolders(ws: WorkspaceContext, query: FolderQuery) {
    const where = this.docWhere(ws, query);
    const groups = await this.prisma.document.groupBy({
      by: ['client_id'],
      where,
      _count: true,
      _sum: { size_bytes: true },
      _max: { updated_at: true },
    });
    const clients = await this.prisma.client.findMany({
      where: {
        id: { in: groups.map((g) => g.client_id) },
        ...(query.search
          ? {
              OR: [
                { first_name: { contains: query.search, mode: 'insensitive' } },
                { last_name: { contains: query.search, mode: 'insensitive' } },
                { company: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: { id: true, first_name: true, last_name: true, company: true },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    });
    return {
      level: 'root',
      breadcrumbs: [],
      folders: clients.map((c) => {
        const g = groups.find((x) => x.client_id === c.id);
        return {
          type: 'client',
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          subtitle: c.company,
          item_count: g?._count ?? 0,
          size_bytes: g?._sum.size_bytes ?? 0,
          last_modified: g?._max.updated_at ?? null,
        };
      }),
      files: [],
    };
  }

  private async formFolders(ws: WorkspaceContext, query: FolderQuery) {
    const client = await this.access.assertClient(ws, query.client_id);
    const where = this.docWhere(ws, query);
    const groups = await this.prisma.document.groupBy({
      by: ['assignment_id'],
      where,
      _count: true,
      _sum: { size_bytes: true },
      _max: { updated_at: true },
    });
    const assignments = await this.prisma.formAssignment.findMany({
      where: { id: { in: groups.map((g) => g.assignment_id).filter(Boolean) } },
      select: { id: true, assigned_at: true, form: { select: { name: true } } },
    });
    const folders = assignments
      .map((a) => {
        const g = groups.find((x) => x.assignment_id === a.id);
        return {
          type: 'form',
          id: a.id,
          name: a.form.name,
          subtitle: `Assigned ${a.assigned_at.toISOString().slice(0, 10)}`,
          item_count: g?._count ?? 0,
          size_bytes: g?._sum.size_bytes ?? 0,
          last_modified: g?._max.updated_at ?? null,
        };
      })
      .filter((f) => !query.search || f.name.toLowerCase().includes(query.search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      level: 'client',
      breadcrumbs: [{ type: 'client', id: client.id, name: `${client.first_name} ${client.last_name}` }],
      folders,
      files: [],
    };
  }

  private async files(ws: WorkspaceContext, query: FolderQuery) {
    const assignment = await this.access.assertAssignment(ws, query.assignment_id);
    const a = await this.prisma.formAssignment.findUnique({
      where: { id: assignment.id },
      select: { id: true, form: { select: { name: true } }, client: { select: { id: true, first_name: true, last_name: true } } },
    });
    if (!a) throw new NotFoundException('Folder not found');
    const docs = await this.prisma.document.findMany({
      where: {
        ...this.docWhere(ws, { ...query, client_id: a.client.id }),
        ...(query.search
          ? {
              OR: [
                { original_filename: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { ...DOCUMENT_INCLUDE, assignment_requirement: { select: { status: true } } },
      orderBy: { uploaded_at: 'desc' },
    });
    return {
      level: 'form',
      breadcrumbs: [
        { type: 'client', id: a.client.id, name: `${a.client.first_name} ${a.client.last_name}` },
        { type: 'form', id: a.id, name: a.form.name },
      ],
      folders: [],
      files: docs.map((d) => ({
        ...mapDocument(d),
        requirement_status: d.superseded_at ? 'REPLACED' : (d.assignment_requirement?.status ?? null),
      })),
    };
  }

  /** Storage summary, cached in Redis for a few minutes and invalidated on upload/replace/delete. */
  async summary(ws: WorkspaceContext) {
    const key = this.access.canSeeAll(ws)
      ? CacheKeys.storage(ws.organization_id)
      : CacheKeys.memberStorage(ws.organization_id, ws.member_id);
    return this.cache.getOrSet(key, 300, async () => {
      const where = this.docWhere(ws, {});
      const [org, totals, byType] = await Promise.all([
        this.prisma.organization.findUnique({ where: { id: ws.organization_id }, select: { storage_limit_bytes: true } }),
        this.prisma.document.aggregate({ where: { organization_id: ws.organization_id, deleted_at: null }, _sum: { size_bytes: true }, _count: true }),
        this.prisma.document.groupBy({ by: ['file_format'], where, _count: true, _sum: { size_bytes: true } }),
      ]);
      return {
        used_bytes: totals._sum.size_bytes ?? 0,
        limit_bytes: Number(org?.storage_limit_bytes ?? 0),
        file_count: totals._count,
        by_type: (['PDF', 'IMAGE', 'WORD', 'EXCEL'] as FileFormat[]).map((f) => {
          const g = byType.find((x) => x.file_format === f);
          return { file_format: f, count: g?._count ?? 0, size_bytes: g?._sum.size_bytes ?? 0 };
        }),
      };
    });
  }
}

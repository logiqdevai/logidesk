import { Injectable } from '@nestjs/common';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'stream';
import { OrganizationRole, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { JobRunContext } from '@/core/jobs/interfaces/jobs.interface';
import { RolePermissions } from '@/shared/auth/permissions';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { FormSubmissionsService } from '@/modules/forms/services/form-submissions.service';

interface ExportActor {
  organization_id: string;
  user_id: string;
  member_id: string;
  role: OrganizationRole;
}

function safe(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 80) || 'untitled';
}

/** Worker-side builders for the EXPORTS queue. Archives are private and purged after 24 hours. */
@Injectable()
export class ExportBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly submissions: FormSubmissionsService,
  ) {}

  private workspace(actor: ExportActor): WorkspaceContext {
    return {
      ...actor,
      session_id: 'export',
      context: 'workspace',
      permissions: RolePermissions[actor.role],
    };
  }

  async buildZip(data: ExportActor & { client_id?: string | null; assignment_id?: string | null }, ctx: JobRunContext) {
    const ws = this.workspace(data);
    const canSeeAll = ws.permissions.includes('clients.view_all');
    const where: Prisma.DocumentWhereInput = {
      organization_id: data.organization_id,
      deleted_at: null,
      client_id: { not: null },
      client: {
        deleted_at: null,
        ...(canSeeAll ? {} : { assignees: { some: { organization_member_id: data.member_id } } }),
      },
      ...(data.client_id ? { client_id: data.client_id } : {}),
      ...(data.assignment_id ? { assignment_id: data.assignment_id } : {}),
    };
    const docs = await this.prisma.document.findMany({
      where,
      include: {
        client: { select: { first_name: true, last_name: true, company: true } },
        assignment: { select: { form: { select: { name: true } } } },
      },
      orderBy: { uploaded_at: 'asc' },
      take: 5000,
    });
    ctx.log('collecting files', { count: docs.length });

    const archive = new ZipArchive({ zlib: { level: 6 } });
    const out = new PassThrough();
    const chunks: Buffer[] = [];
    out.on('data', (c) => chunks.push(c));
    const done = new Promise<void>((resolve, reject) => {
      out.on('end', resolve);
      archive.on('error', reject);
    });
    archive.pipe(out);
    const used = new Set<string>();
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const folder = data.assignment_id
        ? ''
        : `${data.client_id ? '' : `${safe(`${d.client.first_name} ${d.client.last_name}`)}/`}${safe(d.assignment?.form.name ?? 'Other files')}/`;
      let name = `${folder}${d.superseded_at ? 'Replaced - ' : ''}${safe(d.title)} - ${safe(d.original_filename)}`;
      while (used.has(name)) name = name.replace(/(\.[^.]+)?$/, ` (${d.id.slice(0, 4)})$1`);
      used.add(name);
      archive.append(await this.storage.get(d.storage_key), { name });
      if (i % 10 === 0) await ctx.progress(Math.round((i / Math.max(1, docs.length)) * 90));
    }
    if (!docs.length) archive.append('This folder has no files yet.\n', { name: 'README.txt' });
    await archive.finalize();
    await done;
    const buffer = Buffer.concat(chunks);

    let label = 'all-files';
    if (data.assignment_id) {
      const a = await this.prisma.formAssignment.findUnique({
        where: { id: data.assignment_id },
        select: { form: { select: { name: true } }, client: { select: { first_name: true, last_name: true } } },
      });
      label = `${a?.client.first_name}-${a?.client.last_name}-${a?.form.name}`;
    } else if (data.client_id) {
      const c = await this.prisma.client.findUnique({ where: { id: data.client_id }, select: { first_name: true, last_name: true } });
      label = `${c?.first_name}-${c?.last_name}`;
    }
    const filename = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.zip`;
    const key = this.storage.buildKey(data.organization_id, 'exports', filename);
    await this.storage.put(key, buffer, 'application/zip');
    return {
      storage_key: key,
      filename,
      content_type: 'application/zip',
      file_count: docs.length,
      size_bytes: buffer.length,
      expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
    };
  }

  async buildSubmissionsCsv(data: ExportActor & { form_id: string; filters: Record<string, any> }, ctx: JobRunContext) {
    const ws = this.workspace(data);
    const { filename, content } = await this.submissions.toCsv(ws, data.form_id, {
      submitted: 'any',
      ...data.filters,
    } as any);
    ctx.log('csv built', { bytes: content.length });
    const key = this.storage.buildKey(data.organization_id, 'exports', filename);
    await this.storage.put(key, Buffer.from('﻿' + content, 'utf8'), 'text/csv');
    return {
      storage_key: key,
      filename,
      content_type: 'text/csv',
      size_bytes: content.length,
      expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
    };
  }
}

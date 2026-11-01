import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { Permission } from '@/shared/auth/permissions';
import { SearchResponse } from './interfaces/search.interface';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });

const joinName = (p: { first_name: string | null; last_name: string | null }) => [p.first_name, p.last_name].filter(Boolean).join(' ').trim();

/** Global (app bar) search across everything an employee works with, scoped to what they may see. */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
  ) {}

  async search(ws: WorkspaceContext, rawQuery: string, limit: number): Promise<SearchResponse> {
    const q = rawQuery.trim();
    const empty: SearchResponse = { query: q, by_id: false, clients: [], forms: [], assignments: [], documents: [], members: [] };
    if (q.length < 2) return empty;

    const isUuid = UUID_RE.test(q);
    const id = q.toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean).slice(0, 4);
    const can = (p: Permission) => ws.permissions.includes(p);
    const scope = this.access.viaClient(ws);
    const clientScope: Prisma.ClientWhereInput = { deleted_at: null, ...(scope.client ?? {}) };

    const [clients, forms, assignments, documents, members] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          ...this.access.clientWhere(ws),
          ...(isUuid
            ? { id }
            : {
                AND: terms.map((term) => ({
                  OR: [
                    { first_name: contains(term) },
                    { last_name: contains(term) },
                    { company: contains(term) },
                    { email: contains(term) },
                    { phone: contains(term) },
                    { tax_id: contains(term) },
                  ],
                })),
              }),
        },
        select: { id: true, first_name: true, last_name: true, company: true, email: true, status: true },
        orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
        take: limit,
      }),

      can(Permission.FORMS_VIEW)
        ? this.prisma.form.findMany({
            where: {
              organization_id: ws.organization_id,
              deleted_at: null,
              ...(isUuid ? { id } : { OR: [{ name: contains(q) }, { description: contains(q) }] }),
            },
            select: { id: true, name: true, status: true, is_template: true },
            orderBy: { updated_at: 'desc' },
            take: limit,
          })
        : [],

      this.prisma.formAssignment.findMany({
        where: {
          organization_id: ws.organization_id,
          client: clientScope,
          ...(isUuid
            ? { id }
            : {
                OR: [
                  { form: { name: contains(q) } },
                  { client: { OR: [{ first_name: contains(q) }, { last_name: contains(q) }, { company: contains(q) }] } },
                ],
              }),
        },
        select: {
          id: true,
          status: true,
          form: { select: { name: true } },
          client: { select: { id: true, first_name: true, last_name: true, company: true } },
        },
        orderBy: { assigned_at: 'desc' },
        take: limit,
      }),

      this.prisma.document.findMany({
        where: {
          organization_id: ws.organization_id,
          deleted_at: null,
          client_id: { not: null },
          client: clientScope,
          ...(isUuid
            ? { OR: [{ id }, { assignment_requirement_id: id }, { assignment_id: id }] }
            : { OR: [{ title: contains(q) }, { original_filename: contains(q) }] }),
        },
        select: {
          id: true,
          title: true,
          original_filename: true,
          review_status: true,
          assignment_id: true,
          client: { select: { id: true, first_name: true, last_name: true, company: true } },
        },
        orderBy: { uploaded_at: 'desc' },
        take: limit,
      }),

      can(Permission.TEAM_VIEW)
        ? this.prisma.organizationMember.findMany({
            where: {
              organization_id: ws.organization_id,
              removed_at: null,
              ...(isUuid
                ? { OR: [{ id }, { user_id: id }] }
                : {
                    user: {
                      AND: terms.map((term) => ({
                        OR: [{ first_name: contains(term) }, { last_name: contains(term) }, { email: contains(term) }],
                      })),
                    },
                  }),
            },
            select: { id: true, role: true, user: { select: { first_name: true, last_name: true, email: true } } },
            orderBy: { joined_at: 'asc' },
            take: limit,
          })
        : [],
    ]);

    const clientName = (c: { first_name: string; last_name: string; company: string | null }) => joinName(c) || c.company || '';

    return {
      query: q,
      by_id: isUuid,
      clients: clients.map((c) => ({ id: c.id, name: clientName(c), company: c.company, email: c.email, status: c.status })),
      forms,
      assignments: assignments.map((a) => ({
        id: a.id,
        form_name: a.form.name,
        status: a.status,
        client: { id: a.client.id, name: clientName(a.client) },
      })),
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        filename: d.original_filename,
        review_status: d.review_status,
        assignment_id: d.assignment_id,
        client: d.client ? { id: d.client.id, name: clientName(d.client) } : null,
      })),
      members: members.map((m) => ({
        member_id: m.id,
        name: joinName(m.user) || m.user.email,
        email: m.user.email,
        role: m.role,
      })),
    };
  }
}

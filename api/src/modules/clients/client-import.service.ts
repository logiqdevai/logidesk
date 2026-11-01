import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppCacheService } from '@/core/cache/app-cache.service';
import { ClientAccessService } from '@/shared/auth/client-access.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { WorkspaceContext } from '@/shared/auth/interfaces/auth-context.interface';
import { ClientPortalAccessService } from './client-portal-access.service';
import { CreateClientDto } from './dto/client.dto';
import { ImportClientsDto, parseImportMapping } from './dto/client-import.dto';
import {
  ClientImportPreview,
  ClientImportResult,
  ClientImportProblem,
  ClientImportProblemCode,
  ClientImportSkippedRow,
  ClientInvitationsResult,
} from './interfaces/client-import.interface';
import {
  CLIENT_IMPORT_FIELDS,
  checkMapping,
  ClientImportField,
  ClientImportMapping,
  parseSpreadsheet,
  sampleValues,
  splitFullName,
  suggestMapping,
  toCountryCode,
} from './utils/client-import.utils';

const MAX_REPORTED_ROWS = 200;
type UploadedSheet = { buffer: Buffer; originalname: string; size: number };

@Injectable()
export class ClientImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly cache: AppCacheService,
    private readonly access: ClientAccessService,
    private readonly portalAccess: ClientPortalAccessService,
  ) {}

  /** Step 1: read the file, report its columns and propose a mapping. Nothing is stored. */
  async preview(file: UploadedSheet): Promise<ClientImportPreview> {
    const sheet = await parseSpreadsheet(file);
    return {
      file_name: file.originalname,
      format: sheet.format,
      sheet_name: sheet.sheet_name,
      total_rows: sheet.rows.length,
      columns: sheet.headers.map((header, index) => ({
        index,
        header,
        samples: sampleValues(sheet.rows, index),
      })),
      fields: CLIENT_IMPORT_FIELDS,
      suggested_mapping: suggestMapping(sheet.headers),
    };
  }

  /** Step 2: re-read the file with the user's mapping and create the customers. */
  async import(
    ws: WorkspaceContext,
    file: UploadedSheet,
    dto: ImportClientsDto,
  ): Promise<ClientImportResult> {
    const mapping = parseImportMapping(dto.mapping);
    if (!mapping)
      throw new BadRequestException('The column mapping is invalid');
    const hasName =
      mapping.full_name !== undefined ||
      (mapping.first_name !== undefined && mapping.last_name !== undefined);
    if (!hasName)
      throw new BadRequestException(
        'Map a full name column, or both a first name and a last name column',
      );

    const sheet = await parseSpreadsheet(file);
    const columns = Object.values(mapping);
    if (columns.some((c) => c >= sheet.headers.length))
      throw new BadRequestException(
        'The column mapping does not match the file',
      );
    if (new Set(columns).size !== columns.length)
      throw new BadRequestException('A column can only be mapped to one field');

    // Held back until the user confirms: the mapping does not fit the data in some columns.
    const warnings = checkMapping(sheet, mapping);
    if (warnings.length && dto.ignore_warnings !== 'true') {
      return {
        total: sheet.rows.length,
        created: 0,
        skipped_duplicates: 0,
        failed: 0,
        invitable_client_ids: [],
        blocked: true,
        warnings,
        skipped: [],
      };
    }

    const skippedRows: ClientImportSkippedRow[] = [];
    const addSkipped = (row: ClientImportSkippedRow) => {
      if (skippedRows.length < MAX_REPORTED_ROWS) skippedRows.push(row);
    };
    const valid: Array<{ row: number; contact: string; dto: CreateClientDto }> =
      [];
    let failed = 0;
    for (const row of sheet.rows) {
      const result = await this.validateRow(row.cells, mapping, sheet.headers);
      if (result.problems.length) {
        failed++;
        addSkipped({
          row: row.number,
          contact: result.contact,
          reason: 'INVALID',
          problems: result.problems,
        });
      } else {
        valid.push({
          row: row.number,
          contact: result.contact,
          dto: result.dto,
        });
      }
    }

    // Duplicates: by email, against existing clients and within the file itself.
    const skipDuplicates = dto.skip_duplicates !== 'false';
    let skipped = 0;
    let toCreate = valid;
    if (skipDuplicates) {
      const emails = valid
        .map((v) => v.dto.email)
        .filter((e): e is string => !!e);
      const existing = emails.length
        ? await this.prisma.client.findMany({
            where: {
              organization_id: ws.organization_id,
              deleted_at: null,
              email: { in: emails },
            },
            select: { email: true },
          })
        : [];
      const existingEmails = new Set(existing.map((c) => c.email));
      const seenInFile = new Set<string>();
      toCreate = valid.filter((v) => {
        const email = v.dto.email;
        if (!email) return true;
        const inFile = seenInFile.has(email);
        if (existingEmails.has(email) || inFile) {
          skipped++;
          addSkipped({
            row: v.row,
            contact: v.contact,
            reason: inFile ? 'DUPLICATE_IN_FILE' : 'DUPLICATE_EXISTING',
            email,
            problems: [],
          });
          return false;
        }
        seenInFile.add(email);
        return true;
      });
      skippedRows.sort((a, b) => a.row - b.row);
    }

    const ids = toCreate.map(() => randomUUID());
    if (toCreate.length) {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.client.createMany({
            data: toCreate.map(({ dto: c }, i) => ({
              id: ids[i],
              organization_id: ws.organization_id,
              first_name: c.first_name,
              last_name: c.last_name,
              company: c.company ?? null,
              email: c.email ?? null,
              phone: c.phone ?? null,
              tax_id: c.tax_id ?? null,
              country: c.country ?? 'GR',
              address: c.address ?? null,
              company_info: c.company_info ?? null,
              created_by_user_id: ws.user_id,
            })),
          });
          // Same rule as creating one client by hand: the person who adds a client looks after it.
          await tx.clientAssignment.createMany({
            data: ids.map((client_id) => ({
              organization_id: ws.organization_id,
              client_id,
              organization_member_id: ws.member_id,
              assigned_by_user_id: ws.user_id,
            })),
          });
          await this.activity.log(
            {
              organizationId: ws.organization_id,
              action: 'client.imported',
              entityType: 'client',
              actorUserId: ws.user_id,
              description: `Imported ${toCreate.length} clients from ${file.originalname}`,
              metadata: {
                file_name: file.originalname,
                created: toCreate.length,
                skipped_duplicates: skipped,
                failed,
              },
            },
            tx,
          );
        },
        { timeout: 60_000 },
      );
      await this.cache.invalidateOrganization(ws.organization_id);
    }

    return {
      total: sheet.rows.length,
      created: toCreate.length,
      skipped_duplicates: skipped,
      failed,
      invitable_client_ids: toCreate.flatMap((c, i) =>
        c.dto.email ? [ids[i]] : [],
      ),
      blocked: false,
      warnings,
      skipped: skippedRows,
    };
  }

  /** Sends the portal invitation to the given clients (only ones the user can access). */
  async inviteClients(
    ws: WorkspaceContext,
    clientIds: string[],
  ): Promise<ClientInvitationsResult> {
    const clients = await this.prisma.client.findMany({
      where: {
        ...this.access.clientWhere(ws),
        id: { in: clientIds },
        email: { not: null },
      },
      select: { id: true },
    });
    let sent = 0;
    let failed = 0;
    let firstError: unknown = null;
    for (let i = 0; i < clients.length; i += 10) {
      const results = await Promise.allSettled(
        clients
          .slice(i, i + 10)
          .map((c) =>
            this.portalAccess.sendInvitation(
              ws.organization_id,
              c.id,
              ws.user_id,
            ),
          ),
      );
      for (const r of results) {
        if (r.status === 'fulfilled') sent++;
        else {
          failed++;
          firstError ??= r.reason;
        }
      }
    }
    // Nothing went out: surface why (e.g. the portal is public) instead of a silent "0 sent".
    if (!sent && firstError) throw firstError;
    return { sent, failed };
  }

  /** Builds and validates one client from a row. Problems name the column and value in plain terms. */
  private async validateRow(
    cells: string[],
    mapping: ClientImportMapping,
    headers: string[],
  ): Promise<{
    contact: string;
    dto: CreateClientDto;
    problems: ClientImportProblem[];
  }> {
    const value = (field: ClientImportField) =>
      mapping[field] === undefined ? '' : (cells[mapping[field]!] ?? '');
    const usesFullName =
      mapping.full_name !== undefined && !value('first_name');
    const names = usesFullName ? splitFullName(value('full_name')) : null;
    const country = value('country');

    const instance = plainToInstance(CreateClientDto, {
      first_name: names?.first_name ?? value('first_name'),
      last_name: names?.last_name ?? value('last_name'),
      company: value('company'),
      email: value('email'),
      phone: value('phone'),
      tax_id: value('tax_id'),
      country: country ? toCountryCode(country) : undefined,
      address: value('address'),
      company_info: value('company_info'),
    });

    const contact =
      (usesFullName
        ? value('full_name')
        : [value('first_name'), value('last_name')]
            .filter(Boolean)
            .join(' ')) || value('email');
    const issues = await validate(instance);
    const problems: ClientImportProblem[] = issues.map((issue) => {
      // A split full name reports against the full-name column, since that is what the user mapped.
      const field = (
        usesFullName &&
        (issue.property === 'first_name' || issue.property === 'last_name')
          ? 'full_name'
          : issue.property
      ) as ClientImportField;
      const keys = Object.keys(issue.constraints ?? {});
      let code: ClientImportProblemCode = 'INVALID';
      if (keys.includes('isEmail')) code = 'INVALID_EMAIL';
      else if (keys.includes('matches')) code = 'INVALID_COUNTRY';
      else if (keys.includes('maxLength')) code = 'TOO_LONG';
      else if (keys.includes('minLength') || keys.includes('isNotEmpty')) {
        code =
          usesFullName && value('full_name') && issue.property === 'last_name'
            ? 'SINGLE_WORD_NAME'
            : 'REQUIRED';
      }
      const index = mapping[field];
      return {
        field,
        column: index === undefined ? '' : headers[index],
        code,
        value: (field === 'full_name'
          ? value('full_name')
          : value(field)
        ).slice(0, 60),
      };
    });
    return { contact, dto: instance, problems };
  }
}

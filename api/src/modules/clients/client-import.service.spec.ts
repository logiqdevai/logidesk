import ExcelJS from 'exceljs';

// Infrastructure is only needed as injection tokens here (and drags in ESM-only packages).
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
  PartialType: (c: unknown) => c,
}));
jest.mock('@/core/databases/prisma/prisma.service', () => ({
  PrismaService: class {},
}));
jest.mock('@/core/cache/app-cache.service', () => ({
  AppCacheService: class {},
}));
jest.mock('@/modules/activity/activity.service', () => ({
  ActivityService: class {},
}));
jest.mock('@/shared/auth/client-access.service', () => ({
  ClientAccessService: class {},
}));
jest.mock('./client-portal-access.service', () => ({
  ClientPortalAccessService: class {},
}));

import { ClientImportService } from './client-import.service';
import { checkMapping } from './utils/client-import.utils';

async function file(rows: unknown[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('S');
  rows.forEach((r) => ws.addRow(r));
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, originalname: 'customers.xlsx', size: buffer.length };
}

const ws: any = { organization_id: 'org', user_id: 'u', member_id: 'm' };

function service(existingEmails: string[] = []) {
  const tx = {
    client: { createMany: jest.fn() },
    clientAssignment: { createMany: jest.fn() },
  };
  const prisma: any = {
    client: {
      findMany: jest
        .fn()
        .mockResolvedValue(existingEmails.map((email) => ({ email }))),
    },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const activity: any = { log: jest.fn() };
  const cache: any = { invalidateOrganization: jest.fn() };
  return {
    svc: new ClientImportService(prisma, activity, cache, {} as any, {} as any),
    tx,
    prisma,
  };
}

const HEADER = ['First', 'Last', 'Email', 'Tax number'];

describe('checkMapping', () => {
  const headers = HEADER;
  const rows = (cells: string[][]) =>
    cells.map((c, i) => ({ number: i + 2, cells: c }));

  it('flags an Email column that holds numbers', () => {
    const w = checkMapping(
      {
        headers,
        rows: rows([
          ['A', 'B', '6912345678', 'x'],
          ['C', 'D', '6998765432', 'y'],
        ]),
      },
      { email: 2 },
    );
    expect(w).toEqual([
      expect.objectContaining({
        code: 'EMAIL_COLUMN_NOT_EMAILS',
        column: 'Email',
        valid: 0,
        total: 2,
        example: '6912345678',
      }),
    ]);
  });

  it('flags email addresses imported as Tax ID', () => {
    const w = checkMapping(
      {
        headers,
        rows: rows([
          ['A', 'B', 'x', 'a@b.co'],
          ['C', 'D', 'y', 'c@d.co'],
        ]),
      },
      { tax_id: 3 },
    );
    expect(w).toEqual([
      expect.objectContaining({
        code: 'LOOKS_LIKE_EMAIL',
        field: 'tax_id',
        column: 'Tax number',
      }),
    ]);
  });

  it('is quiet for a sensible mapping', () => {
    expect(
      checkMapping(
        { headers, rows: rows([['A', 'B', 'a@b.co', '123']]) },
        { first_name: 0, email: 2, tax_id: 3 },
      ),
    ).toEqual([]);
  });
});

describe('ClientImportService.import', () => {
  it('holds the import back when the mapping looks wrong, creating nothing', async () => {
    const { svc, tx } = service();
    const f = await file([
      HEADER,
      ['Maria', 'P', '6912345678', '1'],
      ['Nikos', 'K', '6998765432', '2'],
    ]);
    const r = await svc.import(ws, f, {
      mapping: JSON.stringify({ first_name: 0, last_name: 1, email: 2 }),
    });
    expect(r.blocked).toBe(true);
    expect(r.created).toBe(0);
    expect(r.warnings[0].code).toBe('EMAIL_COLUMN_NOT_EMAILS');
    expect(tx.client.createMany).not.toHaveBeenCalled();
  });

  it('names each skipped contact, the column, the value and the reason when confirmed anyway', async () => {
    const { svc, tx } = service(['old@example.com']);
    const f = await file([
      HEADER,
      ['Maria', 'P', 'maria@example.com', '1'],
      ['Nikos', 'K', 6912345678, '2'],
      ['', 'Z', 'z@example.com', '3'],
      ['Old', 'Client', 'old@example.com', '4'],
      ['Maria', 'Again', 'maria@example.com', '5'],
    ]);
    const r = await svc.import(ws, f, {
      mapping: JSON.stringify({ first_name: 0, last_name: 1, email: 2 }),
      ignore_warnings: 'true',
    });
    expect(r.blocked).toBe(false);
    expect(r.created).toBe(1);
    expect(tx.client.createMany.mock.calls[0][0].data).toHaveLength(1);
    expect(r.skipped).toEqual([
      expect.objectContaining({
        row: 3,
        contact: 'Nikos K',
        reason: 'INVALID',
        problems: [
          {
            field: 'email',
            column: 'Email',
            code: 'INVALID_EMAIL',
            value: '6912345678',
          },
        ],
      }),
      expect.objectContaining({
        row: 4,
        contact: 'Z',
        reason: 'INVALID',
        problems: [
          expect.objectContaining({
            field: 'first_name',
            code: 'REQUIRED',
            column: 'First',
          }),
        ],
      }),
      expect.objectContaining({
        row: 5,
        contact: 'Old Client',
        reason: 'DUPLICATE_EXISTING',
        email: 'old@example.com',
      }),
      expect.objectContaining({
        row: 6,
        contact: 'Maria Again',
        reason: 'DUPLICATE_IN_FILE',
        email: 'maria@example.com',
      }),
    ]);
    expect(r).toMatchObject({ total: 5, failed: 2, skipped_duplicates: 2 });
  });

  it('explains a single-word full name against the full-name column', async () => {
    const { svc } = service();
    const f = await file([
      ['Name', 'Email'],
      ['Madonna', 'm@example.com'],
    ]);
    const r = await svc.import(ws, f, {
      mapping: JSON.stringify({ full_name: 0, email: 1 }),
    });
    expect(r.skipped[0].problems).toEqual([
      {
        field: 'full_name',
        column: 'Name',
        code: 'SINGLE_WORD_NAME',
        value: 'Madonna',
      },
    ]);
  });
});

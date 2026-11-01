import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import type { ClientImportWarning } from '../interfaces/client-import.interface';

/** Customer fields an uploaded column can be mapped to. `full_name` is split into first/last name. */
export const CLIENT_IMPORT_FIELDS = [
  'first_name',
  'last_name',
  'full_name',
  'company',
  'email',
  'phone',
  'tax_id',
  'country',
  'address',
  'company_info',
] as const;
export type ClientImportField = (typeof CLIENT_IMPORT_FIELDS)[number];

/** Maps a field to the zero-based index of the spreadsheet column that feeds it. */
export type ClientImportMapping = Partial<Record<ClientImportField, number>>;

export const CLIENT_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const CLIENT_IMPORT_MAX_ROWS = 2000;
const MAX_COLUMNS = 200;
const SAMPLE_SIZE = 3;

export interface ParsedSheet {
  format: 'xlsx' | 'csv';
  sheet_name: string | null;
  headers: string[];
  /** Data rows (after the header); `number` is the 1-based spreadsheet row. */
  rows: Array<{ number: number; cells: string[] }>;
}

/** Header names that identify each field, English and Greek. Most specific first. */
const SYNONYMS: Record<ClientImportField, string[]> = {
  first_name: [
    'first name',
    'first',
    'given name',
    'forename',
    'όνομα',
    'μικρό όνομα',
  ],
  last_name: [
    'last name',
    'surname',
    'family name',
    'last',
    'επώνυμο',
    'επίθετο',
  ],
  full_name: [
    'full name',
    'name',
    'customer name',
    'client name',
    'contact name',
    'customer',
    'client',
    'ονοματεπώνυμο',
    'πελάτης',
  ],
  company: [
    'company',
    'company name',
    'organization',
    'organisation',
    'business',
    'employer',
    'εταιρεία',
    'εταιρία',
    'επιχείρηση',
    'οργανισμός',
  ],
  email: [
    'email',
    'email address',
    'e-mail',
    'mail',
    'ηλεκτρονικό ταχυδρομείο',
    'ταχυδρομείο',
  ],
  phone: [
    'phone',
    'phone number',
    'telephone',
    'tel',
    'mobile',
    'cell',
    'cellphone',
    'τηλέφωνο',
    'κινητό',
    'τηλ',
  ],
  tax_id: [
    'tax id',
    'tax number',
    'vat',
    'vat number',
    'vat id',
    'tin',
    'afm',
    'αφμ',
    'φορολογικός αριθμός',
  ],
  country: ['country', 'country code', 'nation', 'χώρα'],
  address: [
    'address',
    'street address',
    'street',
    'location',
    'διεύθυνση',
    'οδός',
  ],
  company_info: [
    'notes',
    'note',
    'comments',
    'comment',
    'info',
    'description',
    'remarks',
    'σημειώσεις',
    'παρατηρήσεις',
    'σχόλια',
  ],
};

/** Lower-cases, strips diacritics (incl. Greek tonos) and everything that is not a letter or digit. */
export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

const NORMALIZED_SYNONYMS = Object.fromEntries(
  CLIENT_IMPORT_FIELDS.map((field) => [
    field,
    SYNONYMS[field].map((s) => normalizeHeader(s)),
  ]),
) as Record<ClientImportField, string[]>;

/** Guesses which column feeds which field from the header names. Each column is used at most once. */
export function suggestMapping(headers: string[]): ClientImportMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: ClientImportMapping = {};
  const used = new Set<number>();
  const order: ClientImportField[] = [
    'email',
    'first_name',
    'last_name',
    'phone',
    'tax_id',
    'company',
    'country',
    'address',
    'company_info',
    'full_name',
  ];

  const assign = (
    field: ClientImportField,
    match: (header: string, synonym: string) => boolean,
  ) => {
    if (mapping[field] !== undefined) return;
    for (const synonym of NORMALIZED_SYNONYMS[field]) {
      const index = normalized.findIndex(
        (h, i) => !used.has(i) && h && match(h, synonym),
      );
      if (index >= 0) {
        mapping[field] = index;
        used.add(index);
        return;
      }
    }
  };

  for (const field of order) assign(field, (h, s) => h === s);
  // Looser second pass ("Customer e-mail (work)"): only for synonyms long enough to be unambiguous.
  for (const field of order)
    assign(field, (h, s) => s.length >= 4 && h.includes(s));

  // A full-name column is only useful when first/last name are not both mapped.
  if (mapping.first_name !== undefined && mapping.last_name !== undefined)
    delete mapping.full_name;
  return mapping;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const v = value as unknown as Record<string, unknown>;
    if (Array.isArray(v.richText))
      return (v.richText as Array<{ text: string }>)
        .map((r) => r.text)
        .join('')
        .trim();
    if ('result' in v) return cellToString(v.result as ExcelJS.CellValue);
    if (typeof v.text === 'string') return v.text.trim();
    if (typeof v.hyperlink === 'string')
      return v.hyperlink.replace(/^mailto:/i, '').trim();
  }
  return '';
}

function sniffFormat(buffer: Buffer, filename: string): 'xlsx' | 'csv' | null {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  )
    return 'xlsx';
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'csv' && !buffer.subarray(0, 4096).includes(0)) return 'csv';
  return null;
}

/** Reads the first non-empty worksheet of an .xlsx (or a .csv): the first non-empty row is the header row. */
export async function parseSpreadsheet(file: {
  buffer: Buffer;
  originalname: string;
  size: number;
}): Promise<ParsedSheet> {
  if (!file?.buffer?.length)
    throw new BadRequestException('Upload an Excel file');
  if (file.size > CLIENT_IMPORT_MAX_BYTES)
    throw new BadRequestException('The file is larger than 5 MB');
  const format = sniffFormat(file.buffer, file.originalname);
  if (!format)
    throw new BadRequestException('Only .xlsx and .csv files can be imported');

  const workbook = new ExcelJS.Workbook();
  try {
    if (format === 'xlsx')
      await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
    else await workbook.csv.read(Readable.from(file.buffer));
  } catch {
    throw new BadRequestException(
      'The file could not be read. Make sure it is a valid Excel file',
    );
  }
  const sheet = workbook.worksheets.find((s) => s.actualRowCount > 0);
  if (!sheet) throw new BadRequestException('The file has no data');

  const width = Math.min(
    sheet.actualColumnCount || sheet.columnCount,
    MAX_COLUMNS,
  );
  let headers: string[] | null = null;
  const rows: ParsedSheet['rows'] = [];
  sheet.eachRow({ includeEmpty: false }, (row, number) => {
    const cells = Array.from({ length: width }, (_, i) =>
      cellToString(row.getCell(i + 1).value),
    );
    if (!cells.some(Boolean)) return;
    if (!headers) {
      headers = cells.map((h, i) => h || `Column ${i + 1}`);
      return;
    }
    // Keep one extra row so the limit check below can tell "exactly at the limit" from "over it".
    if (rows.length <= CLIENT_IMPORT_MAX_ROWS) rows.push({ number, cells });
  });

  if (!headers) throw new BadRequestException('The file has no header row');
  if (!rows.length)
    throw new BadRequestException('The file has a header row but no data rows');
  if (rows.length > CLIENT_IMPORT_MAX_ROWS)
    throw new BadRequestException(
      `A file can contain at most ${CLIENT_IMPORT_MAX_ROWS} rows`,
    );
  return { format, sheet_name: sheet.name ?? null, headers, rows };
}

export function sampleValues(
  rows: ParsedSheet['rows'],
  column: number,
): string[] {
  const out: string[] = [];
  for (const row of rows) {
    if (row.cells[column]) out.push(row.cells[column].slice(0, 80));
    if (out.length >= SAMPLE_SIZE) break;
  }
  return out;
}

/** English and Greek country names -> ISO alpha-2, built from the runtime's own locale data. */
const COUNTRY_NAMES = (() => {
  const map = new Map<string, string>();
  try {
    const names = [
      new Intl.DisplayNames(['en'], { type: 'region' }),
      new Intl.DisplayNames(['el'], { type: 'region' }),
    ];
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        for (const display of names) {
          const name = display.of(code);
          if (name && name !== code) map.set(normalizeHeader(name), code);
        }
      }
    }
  } catch {
    /* Intl.DisplayNames unavailable: only ISO codes are accepted */
  }
  return map;
})();

/** ISO alpha-2 from a country name (English/Greek); anything else passes through for validation. */
export function toCountryCode(value: string): string {
  return COUNTRY_NAMES.get(normalizeHeader(value)) ?? value;
}

export function splitFullName(full: string): {
  first_name: string;
  last_name: string;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first_name: parts[0] ?? '', last_name: '' };
  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts[parts.length - 1],
  };
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const looksLikeEmail = (value: string): boolean =>
  EMAIL_SHAPE.test(value);

/** Fields where a column full of email addresses almost certainly means the wrong column was chosen. */
const NOT_EMAIL_FIELDS: ClientImportField[] = [
  'first_name',
  'last_name',
  'full_name',
  'tax_id',
  'phone',
  'country',
];

/**
 * Compares what the user mapped with what is actually in the columns. Catches the classic slips:
 * Email pointing at a column of numbers, or an email column imported as Tax ID / Phone / a name.
 */
export function checkMapping(
  sheet: Pick<ParsedSheet, 'headers' | 'rows'>,
  mapping: ClientImportMapping,
): ClientImportWarning[] {
  const warnings: ClientImportWarning[] = [];
  for (const [field, index] of Object.entries(mapping) as Array<
    [ClientImportField, number]
  >) {
    const values = sheet.rows.map((r) => r.cells[index]).filter(Boolean);
    if (!values.length) continue;
    const emails = values.filter(looksLikeEmail);
    const column = sheet.headers[index];
    if (field === 'email' && emails.length / values.length < 0.5) {
      warnings.push({
        code: 'EMAIL_COLUMN_NOT_EMAILS',
        field,
        column,
        valid: emails.length,
        total: values.length,
        example: (values.find((v) => !looksLikeEmail(v)) ?? '').slice(0, 60),
      });
    } else if (
      NOT_EMAIL_FIELDS.includes(field) &&
      emails.length / values.length >= 0.8
    ) {
      warnings.push({
        code: 'LOOKS_LIKE_EMAIL',
        field,
        column,
        valid: emails.length,
        total: values.length,
        example: emails[0].slice(0, 60),
      });
    }
  }
  return warnings;
}

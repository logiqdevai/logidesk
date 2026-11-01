import ExcelJS from 'exceljs';
import {
  parseSpreadsheet,
  sampleValues,
  splitFullName,
  suggestMapping,
  toCountryCode,
} from './client-import.utils';

async function workbook(
  rows: unknown[][],
): Promise<{ buffer: Buffer; originalname: string; size: number }> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Customers');
  rows.forEach((r) => ws.addRow(r));
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, originalname: 'customers.xlsx', size: buffer.length };
}

describe('suggestMapping', () => {
  it('recognizes English headers regardless of case and punctuation', () => {
    const m = suggestMapping([
      'First Name',
      'LAST_NAME',
      'E-mail',
      'Mobile',
      'VAT Number',
      'Company Name',
      'Country',
      'Street Address',
      'Notes',
    ]);
    expect(m).toEqual({
      first_name: 0,
      last_name: 1,
      email: 2,
      phone: 3,
      tax_id: 4,
      company: 5,
      country: 6,
      address: 7,
      company_info: 8,
    });
  });

  it('recognizes Greek headers with or without accents', () => {
    const m = suggestMapping([
      'Όνομα',
      'Επώνυμο',
      'Email',
      'Τηλέφωνο',
      'ΑΦΜ',
      'Εταιρεία',
      'Διεύθυνση',
    ]);
    expect(m).toMatchObject({
      first_name: 0,
      last_name: 1,
      email: 2,
      phone: 3,
      tax_id: 4,
      company: 5,
      address: 6,
    });
  });

  it('maps a single "Name" column to full_name and never uses a column twice', () => {
    const m = suggestMapping(['Name', 'Email']);
    expect(m).toEqual({ full_name: 0, email: 1 });
  });

  it('drops full_name when first and last name are both present', () => {
    const m = suggestMapping(['Name', 'First name', 'Surname']);
    expect(m.full_name).toBeUndefined();
    expect(m).toMatchObject({ first_name: 1, last_name: 2 });
  });

  it('leaves unknown columns unmapped', () => {
    expect(suggestMapping(['Foo', 'Bar'])).toEqual({});
  });
});

describe('parseSpreadsheet', () => {
  it('reads headers and rows, skipping blank rows, and stringifies numbers and rich cells', async () => {
    const file = await workbook([
      [],
      ['Name', 'Email', 'Phone'],
      [
        'Maria Papadopoulou',
        { text: 'maria@example.com', hyperlink: 'mailto:maria@example.com' },
        6912345678,
      ],
      [],
      ['Nikos K', 'nikos@example.com', ''],
    ]);
    const sheet = await parseSpreadsheet(file);
    expect(sheet.format).toBe('xlsx');
    expect(sheet.headers).toEqual(['Name', 'Email', 'Phone']);
    expect(sheet.rows.map((r) => r.cells)).toEqual([
      ['Maria Papadopoulou', 'maria@example.com', '6912345678'],
      ['Nikos K', 'nikos@example.com', ''],
    ]);
    expect(sampleValues(sheet.rows, 2)).toEqual(['6912345678']);
  });

  it('names blank header cells', async () => {
    const sheet = await parseSpreadsheet(
      await workbook([
        ['Name', null, 'Email'],
        ['A B', 'x', 'a@b.co'],
      ]),
    );
    expect(sheet.headers).toEqual(['Name', 'Column 2', 'Email']);
  });

  it('reads csv files', async () => {
    const buffer = Buffer.from('Name,Email\nMaria P,maria@example.com\n');
    const sheet = await parseSpreadsheet({
      buffer,
      originalname: 'c.csv',
      size: buffer.length,
    });
    expect(sheet.format).toBe('csv');
    expect(sheet.rows[0].cells).toEqual(['Maria P', 'maria@example.com']);
  });

  it('rejects unsupported files, header-only files and empty uploads', async () => {
    const pdf = Buffer.from('%PDF-1.4 fake');
    await expect(
      parseSpreadsheet({
        buffer: pdf,
        originalname: 'a.pdf',
        size: pdf.length,
      }),
    ).rejects.toThrow('Only .xlsx and .csv');
    await expect(
      parseSpreadsheet(await workbook([['Name', 'Email']])),
    ).rejects.toThrow('no data rows');
    await expect(
      parseSpreadsheet({
        buffer: Buffer.alloc(0),
        originalname: 'a.xlsx',
        size: 0,
      }),
    ).rejects.toThrow('Upload an Excel file');
  });
});

describe('helpers', () => {
  it('splits full names on the last space', () => {
    expect(splitFullName('Maria Anna Papadopoulou')).toEqual({
      first_name: 'Maria Anna',
      last_name: 'Papadopoulou',
    });
    expect(splitFullName('Madonna')).toEqual({
      first_name: 'Madonna',
      last_name: '',
    });
  });

  it('converts English and Greek country names to ISO codes and passes codes through', () => {
    expect(toCountryCode('Greece')).toBe('GR');
    expect(toCountryCode('Ελλάδα')).toBe('GR');
    expect(toCountryCode('DE')).toBe('DE');
  });
});

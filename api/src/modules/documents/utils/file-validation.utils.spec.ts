import { BadRequestException } from '@nestjs/common';
import { sniffFormat, validateUpload } from './file-validation.utils';

const file = (name: string, bytes: Buffer) => ({ originalname: name, mimetype: 'application/octet-stream', size: bytes.length, buffer: bytes });
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('upload validation', () => {
  it('detects formats from content, not from the client-supplied type', () => {
    expect(sniffFormat(PDF)?.format).toBe('PDF');
    expect(sniffFormat(PNG)?.format).toBe('IMAGE');
    expect(sniffFormat(Buffer.from('MZ fake executable'))).toBeNull();
  });

  it('accepts a real PDF in an accepted group', () => {
    expect(validateUpload(file('statement.pdf', PDF), { accepted: ['PDF'], maxSizeMb: 1 }).mime).toBe('application/pdf');
  });

  it('rejects spoofed extensions, disallowed groups and oversize files', () => {
    expect(() => validateUpload(file('virus.pdf', Buffer.from('MZ fake executable')), { accepted: ['PDF'], maxSizeMb: 1 })).toThrow(BadRequestException);
    expect(() => validateUpload(file('photo.pdf', PNG), { accepted: ['PDF', 'IMAGE'], maxSizeMb: 1 })).toThrow(BadRequestException);
    expect(() => validateUpload(file('photo.png', PNG), { accepted: ['PDF'], maxSizeMb: 1 })).toThrow(BadRequestException);
    const big = Buffer.concat([PDF, Buffer.alloc(2 * 1024 * 1024)]);
    expect(() => validateUpload(file('big.pdf', big), { accepted: ['PDF'], maxSizeMb: 1 })).toThrow(BadRequestException);
  });
});

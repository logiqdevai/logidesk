import { BadRequestException } from '@nestjs/common';
import { FileFormat } from 'generated/prisma';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** The four format groups users pick from (images are one "Image" option). */
export const FORMAT_RULES: Record<FileFormat, { label: string; extensions: string[]; mime: string }> = {
  PDF: { label: 'PDF', extensions: ['pdf'], mime: 'application/pdf' },
  IMAGE: { label: 'Image', extensions: ['jpg', 'jpeg', 'png'], mime: 'image/jpeg' },
  WORD: {
    label: 'Word',
    extensions: ['docx'],
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  EXCEL: {
    label: 'Excel',
    extensions: ['xlsx'],
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
};

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  return bytes.every((b, i) => buffer[i] === b);
}

/** Detects the real file type from its content (magic numbers), not the client-provided MIME type. */
export function sniffFormat(buffer: Buffer): { format: FileFormat; mime: string } | null {
  if (buffer.length < 8) return null;
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return { format: FileFormat.PDF, mime: 'application/pdf' };
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { format: FileFormat.IMAGE, mime: 'image/jpeg' };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { format: FileFormat.IMAGE, mime: 'image/png' };
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    const head = buffer.subarray(0, Math.min(buffer.length, 64 * 1024)).toString('latin1');
    const tail = buffer.subarray(Math.max(0, buffer.length - 64 * 1024)).toString('latin1');
    const text = head + tail;
    if (text.includes('word/')) return { format: FileFormat.WORD, mime: FORMAT_RULES.WORD.mime };
    if (text.includes('xl/')) return { format: FileFormat.EXCEL, mime: FORMAT_RULES.EXCEL.mime };
  }
  return null;
}

export function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : '';
}

export function describeFormats(formats: FileFormat[]): string {
  return formats.map((f) => FORMAT_RULES[f].label).join(', ');
}

/**
 * Validates extension, actual content type and size synchronously so the uploader gets
 * immediate feedback. Returns the detected format and a trusted MIME type.
 */
export function validateUpload(
  file: UploadedFile,
  rules: { accepted: FileFormat[]; maxSizeMb: number },
): { format: FileFormat; mime: string } {
  const name = file.originalname || 'file';
  if (!file.size || !file.buffer?.length) throw new BadRequestException(`"${name}" is empty`);
  if (file.size > rules.maxSizeMb * 1024 * 1024) {
    throw new BadRequestException(`"${name}" is larger than ${rules.maxSizeMb} MB`);
  }
  const ext = extensionOf(name);
  const byExtension = (Object.keys(FORMAT_RULES) as FileFormat[]).find((f) => FORMAT_RULES[f].extensions.includes(ext));
  const sniffed = sniffFormat(file.buffer);
  if (!byExtension || !sniffed || sniffed.format !== byExtension) {
    throw new BadRequestException(`"${name}" is not a valid ${describeFormats(rules.accepted)} file`);
  }
  if (!rules.accepted.includes(sniffed.format)) {
    throw new BadRequestException(`"${name}" is not accepted here. Allowed: ${describeFormats(rules.accepted)}`);
  }
  return sniffed;
}

/** Multer limits shared by every upload endpoint (per-requirement limits are checked after). */
export const UPLOAD_LIMITS = { fileSize: 100 * 1024 * 1024, files: 20 };

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { z } from 'zod';
import {
  CLIENT_IMPORT_FIELDS,
  ClientImportMapping,
} from '../utils/client-import.utils';

/** Multipart body: the file travels as `file`, the rest as strings. */
export class ImportClientsDto {
  @ApiProperty({
    description:
      'JSON object mapping a customer field to the zero-based column index',
    example: '{"first_name":0,"last_name":1,"email":2}',
  })
  @IsString()
  @MaxLength(2000)
  mapping: string;

  @ApiPropertyOptional({
    description: 'Skip rows whose email already exists (default true)',
    enum: ['true', 'false'],
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  skip_duplicates?: string;

  @ApiPropertyOptional({
    description:
      'Import even though the column mapping looks wrong for some columns',
    enum: ['true', 'false'],
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  ignore_warnings?: string;
}

export class InviteImportedClientsDto {
  @ApiProperty({
    type: [String],
    description: 'Clients to send the portal invitation to',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsUUID('all', { each: true })
  client_ids: string[];
}

const MappingSchema = z.partialRecord(
  z.enum(CLIENT_IMPORT_FIELDS),
  z.number().int().min(0).max(199),
);

/** Parses the JSON mapping; returns null when it is malformed. */
export function parseImportMapping(raw: string): ClientImportMapping | null {
  try {
    const result = MappingSchema.safeParse(JSON.parse(raw));
    return result.success ? (result.data as ClientImportMapping) : null;
  } catch {
    return null;
  }
}

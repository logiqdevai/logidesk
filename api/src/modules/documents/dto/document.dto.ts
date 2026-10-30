import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { z } from 'zod';
import { optionalString, PaginationQuerySchema } from '@/shared/utils/pagination/pagination.utils';

export class UploadDocumentDto {
  @ApiProperty({ description: 'Requirement inside an assignment the files satisfy' })
  @IsUUID()
  assignment_requirement_id: string;

  @ApiPropertyOptional({ example: '2027-10-27' })
  @IsOptional()
  @ValidateIf((o) => o.expiration_date !== '' && o.expiration_date !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use a valid date' })
  expiration_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: '2027-10-27', description: 'null clears the expiration date' })
  @IsOptional()
  @ValidateIf((o) => o.expiration_date !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use a valid date' })
  expiration_date?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum({ APPROVED: 'APPROVED', REJECTED: 'REJECTED' })
  decision: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Required when rejecting; shown to the client' })
  @ValidateIf((o) => o.decision === 'REJECTED')
  @IsString()
  @MinLength(3, { message: 'Tell the client why the document was rejected' })
  @MaxLength(1000)
  reason?: string;
}

export class SignedUrlQueryDto {
  @ApiPropertyOptional({ enum: ['inline', 'attachment'] })
  @IsOptional()
  @IsIn(['inline', 'attachment'])
  disposition?: 'inline' | 'attachment';
}

export const DocumentQuerySchema = PaginationQuerySchema.extend({
  search: optionalString,
  client_id: optionalString,
  form_id: optionalString,
  assignment_id: optionalString,
  document_type: optionalString,
  status: optionalString,
  source: optionalString,
  file_format: optionalString,
  expiration: z.enum(['any', 'expired', '30d', '90d', 'none']).optional().default('any'),
  uploaded: z.enum(['any', '7d', '30d', '90d', 'never']).optional().default('any'),
  sort: z.enum(['uploaded_at', 'expiration_date', 'name', 'client']).optional().default('uploaded_at'),
});
export type DocumentQueryType = z.infer<typeof DocumentQuerySchema>;

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { z } from 'zod';
import { optionalString, PaginationQuerySchema } from '@/shared/utils/pagination/pagination.utils';

export const InboxActions = ['approve', 'reject', 'confirm', 'change', 'dismiss'] as const;
export type InboxAction = (typeof InboxActions)[number];

export class ResolveInboxItemDto {
  @ApiProperty({ enum: InboxActions })
  @IsIn(InboxActions)
  action: InboxAction;

  @ApiPropertyOptional({ description: 'Rejection reason (shown to the client) or dismissal note' })
  @ValidateIf((o) => o.action === 'reject')
  @IsString()
  @MinLength(3, { message: 'Tell the client why the document was rejected' })
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ description: 'Requirement to link the document to (change)' })
  @ValidateIf((o) => o.action === 'change')
  @IsUUID()
  assignment_requirement_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export const InboxQuerySchema = PaginationQuerySchema.extend({
  view: z.enum(['needs_review', 'processed', 'all']).optional().default('needs_review'),
  source: optionalString,
  status: optionalString,
  confidence: optionalString,
  client_id: optionalString,
  document_type: optionalString,
  search: optionalString,
  from: optionalString,
  to: optionalString,
  sort: z.enum(['newest', 'oldest', 'confidence']).optional().default('newest'),
});
export type InboxQueryType = z.infer<typeof InboxQuerySchema>;

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export const CONTACT_TOPICS = ['technical', 'billing', 'account', 'feature', 'other'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export class ContactDto {
  @ApiProperty({ example: 'Alex Morgan' })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Enter your name' })
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'alex@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ example: '+30 690 000 0000' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ enum: CONTACT_TOPICS })
  @IsIn(CONTACT_TOPICS, { message: 'Select a topic' })
  topic: ContactTopic;

  @ApiProperty({ example: 'Question about pricing' })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Enter a subject' })
  @MaxLength(150)
  subject: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters' })
  @MaxLength(5000)
  message: string;
}

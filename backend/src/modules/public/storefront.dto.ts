import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class GalleryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(40)
  tag?: string | null;

  @ApiPropertyOptional({ description: '1 = include drafts (staff with content.view)' })
  @IsOptional()
  @IsString()
  @MaxLength(1)
  preview?: string;
}

/** POST /public/organizations/:slug/inquiries. */
export class CreateInquiryDto {
  @ApiProperty({ example: 'Ayesha Khan' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tell us your name' })
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '0300 1234567' })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(160)
  subject?: string | null;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'Write at least a sentence (10 characters)' })
  @MaxLength(2000)
  message: string;

  /** Honeypot: people leave it empty; bots fill it in. */
  @ApiPropertyOptional({ description: 'Leave empty' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;
}

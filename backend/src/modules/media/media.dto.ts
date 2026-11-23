import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

/** Multipart fields sent with the `file` part. */
export class UploadMediaDto {
  @ApiPropertyOptional({ description: 'Describes the image for screen readers' })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(255)
  altText?: string | null;
}

export class UpdateMediaDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(255)
  altText?: string | null;
}

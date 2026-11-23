import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MAX_PAGE_SIZE = 100;

/**
 * Standard list query: `?page=1&pageSize=20&q=hunza&sort=createdAt:desc`.
 * Endpoints extend this with their own filters and pass their sort whitelist
 * to `resolveSort()`.
 */
export class ListQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: Number,
    default: 20,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize = 20;

  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  q?: string;

  @ApiPropertyOptional({ type: String, example: 'createdAt:desc' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9]*:(asc|desc)$/, {
    message: 'sort must look like "field:asc" or "field:desc"',
  })
  sort?: string;
}

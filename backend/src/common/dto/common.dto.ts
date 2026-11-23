import { ApiProperty } from '@nestjs/swagger';

/**
 * Response-only shape. Deliberately carries no class-validator decorators:
 * it must never be usable as a request body, or `isActive` becomes writable
 * by anyone who can reach an endpoint that binds a DTO extending it.
 *
 * List queries use `ListQueryDto` (list-query.dto.ts) and return
 * `Page<T>` (`{ items, meta }`, common/pagination/page.ts).
 */
export class BaseDto {
  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Boolean })
  isActive: boolean;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}

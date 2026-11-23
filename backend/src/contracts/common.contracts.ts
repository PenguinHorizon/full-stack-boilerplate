import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/*
 * Response contracts shared by every module. These classes are the source for
 * Swagger and for frontend/src/shared/types/api.generated.d.ts
 * (`npm run contracts:generate`). Keep them free of path-alias imports: the
 * generator loads them with plain ts-node.
 */

export class FieldErrorResponse {
  @ApiProperty({ example: 'email' }) field: string;
  @ApiProperty({ example: 'email must be an email' }) message: string;
}

export class ApiErrorResponse {
  @ApiProperty({ enum: [false] }) success: false;
  @ApiProperty({ type: 'integer', example: 422 }) statusCode: number;
  @ApiProperty({ example: 'VALIDATION_FAILED' }) code: string;
  @ApiProperty() message: string;
  @ApiPropertyOptional({ type: () => [FieldErrorResponse] })
  errors?: FieldErrorResponse[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  details?: Record<string, unknown>;
  @ApiPropertyOptional() requestId?: string;
  @ApiProperty({ format: 'date-time' }) timestamp: string;
  @ApiProperty() path: string;
}

export class PageMetaResponse {
  @ApiProperty({ type: 'integer' }) page: number;
  @ApiProperty({ type: 'integer' }) pageSize: number;
  @ApiProperty({ type: 'integer' }) total: number;
  @ApiProperty({ type: 'integer' }) totalPages: number;
}

export class HealthResponse {
  @ApiProperty() status: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  info?: Record<string, unknown>;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  error?: Record<string, unknown>;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  details?: Record<string, unknown>;
}

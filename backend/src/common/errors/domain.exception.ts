import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface FieldError {
  field: string;
  message: string;
}

export interface DomainErrorBody {
  code: ErrorCode | string;
  message: string;
  errors?: FieldError[];
  details?: Record<string, unknown>;
}

/**
 * A business-rule failure with a stable error code.
 *
 *   throw new DomainException(ErrorCode.SlugTaken, 'That slug is already in use', 409);
 *
 * GlobalExceptionFilter turns it into the standard error envelope.
 */
export class DomainException extends HttpException {
  constructor(
    readonly code: ErrorCode | string,
    message: string,
    status: number = HttpStatus.UNPROCESSABLE_ENTITY,
    readonly details?: Record<string, unknown>,
    readonly fieldErrors?: FieldError[],
  ) {
    const body: DomainErrorBody = { code, message };
    if (fieldErrors?.length) body.errors = fieldErrors;
    if (details) body.details = details;
    super(body, status);
  }
}

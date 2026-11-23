import { BadRequestException, ValidationError } from '@nestjs/common';
import { ErrorCode } from './error-codes';
import { FieldError } from './domain.exception';

/** Flattens class-validator's nested tree into `[{ field: 'a.b[0].c', message }]`. */
export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const isIndex = /^\d+$/.test(error.property);
    const field = parent
      ? isIndex
        ? `${parent}[${error.property}]`
        : `${parent}.${error.property}`
      : error.property;

    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

/**
 * `exceptionFactory` for the global ValidationPipe: field-level errors so the
 * frontend can attach each message to its form field.
 */
export function validationExceptionFactory(errors: ValidationError[]) {
  const fieldErrors = flattenValidationErrors(errors);
  return new BadRequestException({
    code: ErrorCode.ValidationFailed,
    message: fieldErrors[0]?.message ?? 'Validation failed',
    errors: fieldErrors,
  });
}

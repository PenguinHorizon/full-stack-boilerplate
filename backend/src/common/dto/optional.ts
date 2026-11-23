import { ValidateIf } from 'class-validator';

/**
 * Optional, but never null. `@IsOptional()` skips validation for both
 * `undefined` and `null`, which would let `{ "name": null }` through to a
 * NOT NULL column (a 500 instead of a 400). This skips `undefined` only, so a
 * null still meets the field's other validators and fails them.
 */
export const OptionalNotNull = () =>
  ValidateIf((_object: unknown, value: unknown) => value !== undefined);

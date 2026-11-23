import { HttpStatus } from '@nestjs/common';
import { EntityManager, EntityTarget, In, Not, ObjectLiteral } from 'typeorm';
import { nextSlugCandidate, slugify } from '@common/domain/slug';
import { DomainException, FieldError } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';

/*
 * Helpers for tenant-owned feature services: slugs unique per organization
 * (including soft-deleted rows, which free theirs on delete), id checks
 * within the tenant, and field-error shortcuts.
 */

export async function uniqueSlug<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: EntityTarget<T>,
  organizationId: number,
  requested: string | undefined | null,
  name: string,
  maxLength: number,
  exceptId?: number,
  fallback = 'item',
): Promise<string> {
  const taken = (slug: string) =>
    manager.exists(entity, {
      where: {
        organizationId,
        slug,
        ...(exceptId ? { id: Not(exceptId) } : {}),
      } as never,
      withDeleted: true,
    });

  if (requested) {
    if (await taken(requested)) {
      throw new DomainException(
        ErrorCode.SlugTaken,
        'That web address is already in use.',
        HttpStatus.CONFLICT,
        undefined,
        [{ field: 'slug', message: 'Already in use' }],
      );
    }
    return requested;
  }
  const base = slugify(name, maxLength) || fallback;
  if (!(await taken(base))) return base;
  for (let attempt = 2; attempt < 200; attempt++) {
    const candidate = nextSlugCandidate(base, attempt, maxLength);
    if (!(await taken(candidate))) return candidate;
  }
  return nextSlugCandidate(base, Date.now() % 1_000_000, maxLength);
}

/** 422 INVALID_REFERENCE unless every id is a row of this organization. */
export async function assertIdsInOrganization<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: EntityTarget<T>,
  organizationId: number,
  ids: number[],
  field: string,
  label: string,
): Promise<void> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const found = await manager.count(entity, {
    where: { organizationId, id: In(unique) } as never,
  });
  if (found !== unique.length) {
    throw invalidReference(field, `Choose ${label} from this organization`);
  }
}

export function invalidReference(field: string, message: string) {
  return new DomainException(
    ErrorCode.InvalidReference,
    message,
    HttpStatus.UNPROCESSABLE_ENTITY,
    undefined,
    [{ field, message }],
  );
}

export function validationFailed(errors: FieldError[]) {
  return new DomainException(
    ErrorCode.ValidationFailed,
    errors[0]?.message ?? 'Some fields need fixing.',
    HttpStatus.BAD_REQUEST,
    undefined,
    errors,
  );
}

/** Duplicates in a list, compared case-insensitively. */
export function duplicates(values: Array<string | null | undefined>): Set<string> {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const key = value.trim().toLowerCase();
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
  }
  return dupes;
}

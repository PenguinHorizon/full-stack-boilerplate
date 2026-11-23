import { ErrorCode } from '@common/errors/error-codes';
import { DomainException } from '@common/errors/domain.exception';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

/** TypeORM `skip` / `take` for a page request. */
export function pageWindow({ page, pageSize }: PageRequest) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function toPage<T>(
  items: T[],
  total: number,
  { page, pageSize }: PageRequest,
): Page<T> {
  return {
    items,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export type SortDirection = 'ASC' | 'DESC';

/**
 * Validates `field:dir` against an endpoint's whitelist and maps the public
 * field name to an entity property. Unknown fields are a 400, never silently
 * ignored and never passed to SQL.
 */
export function resolveSort<A extends Record<string, string>>(
  sort: string | undefined,
  allowed: A,
  fallback: { field: keyof A & string; direction: SortDirection },
): { column: string; direction: SortDirection } {
  if (!sort) {
    return { column: allowed[fallback.field], direction: fallback.direction };
  }
  const [field, dir] = sort.split(':');
  if (!Object.prototype.hasOwnProperty.call(allowed, field)) {
    throw new DomainException(
      ErrorCode.ValidationFailed,
      `Cannot sort by "${field}". Allowed: ${Object.keys(allowed).join(', ')}`,
      400,
      undefined,
      [{ field: 'sort', message: `Unsupported sort field "${field}"` }],
    );
  }
  return {
    column: allowed[field],
    direction: dir === 'asc' ? 'ASC' : 'DESC',
  };
}

import { FindOptionsWhere, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { TenantContext } from './tenant-context';

/*
 * The only sanctioned way to query tenant-owned tables from admin services.
 * Reviewers should treat any repository call on a tenant table that does not
 * go through these helpers as a bug.
 */

let paramSeq = 0;
/** Unique parameter names, so scoping twice in one query cannot collide. */
const param = (base: string) => `${base}_${++paramSeq}`;

/** Adds `alias.organizationId = :orgId`. */
export function scopeQuery<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  ctx: Pick<TenantContext, 'organizationId'>,
): SelectQueryBuilder<T> {
  const orgId = param('tenant_rid');
  return qb.andWhere(`${alias}.organizationId = :${orgId}`, {
    [orgId]: ctx.organizationId,
  });
}

/**
 * `where` for repository `find*` calls. The tenant key is applied last so a
 * caller-supplied `organizationId` can never widen the scope.
 */
export function tenantWhere<T extends { organizationId: number }>(
  ctx: Pick<TenantContext, 'organizationId'>,
  where: FindOptionsWhere<T> = {},
): FindOptionsWhere<T> {
  return { ...where, organizationId: ctx.organizationId } as FindOptionsWhere<T>;
}

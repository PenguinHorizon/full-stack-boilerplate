import { SelectQueryBuilder } from 'typeorm';
import { scopeQuery, tenantWhere } from './scoped-query';
import { hasPermission } from './tenant-context';

type Call = { sql: string; params?: Record<string, unknown> };

function fakeQb() {
  const calls: Call[] = [];
  const qb = {
    andWhere(sql: string, params?: Record<string, unknown>) {
      calls.push({ sql, params });
      return qb;
    },
  };
  return { qb: qb as unknown as SelectQueryBuilder<{ organizationId: number }>, calls };
}

const ctx = { organizationId: 7 };

describe('scopeQuery', () => {
  it('always adds the organization condition', () => {
    const { qb, calls } = fakeQb();
    scopeQuery(qb, 'p', ctx);
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toMatch(/^p\.organizationId = :tenant_rid_\d+$/);
    expect(Object.values(calls[0].params ?? {})).toEqual([7]);
  });

  it('uses unique parameter names on repeated scoping', () => {
    const { qb, calls } = fakeQb();
    scopeQuery(qb, 'a', ctx);
    scopeQuery(qb, 'b', ctx);
    const names = calls.map((call) => Object.keys(call.params ?? {})[0]);
    expect(new Set(names).size).toBe(2);
  });
});

describe('tenantWhere', () => {
  it('cannot be widened by a caller-supplied organizationId', () => {
    const where = tenantWhere<{ organizationId: number; name: string }>(ctx, {
      organizationId: 999,
      name: 'x',
    });
    expect(where).toEqual({ organizationId: 7, name: 'x' });
  });
});

describe('tenant context helpers', () => {
  it('super admins hold every permission', () => {
    expect(hasPermission({ permissions: [], isSuperAdmin: true }, 'team.view')).toBe(
      true,
    );
    expect(
      hasPermission({ permissions: ['team.view'], isSuperAdmin: false }, 'team.view'),
    ).toBe(true);
    expect(hasPermission({ permissions: [], isSuperAdmin: false }, 'team.view')).toBe(
      false,
    );
  });
});

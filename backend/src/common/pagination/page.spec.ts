import { HttpException } from '@nestjs/common';
import { pageWindow, resolveSort, toPage } from './page';

describe('pagination helpers', () => {
  it('computes skip/take from page and pageSize', () => {
    expect(pageWindow({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
    expect(pageWindow({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it('builds meta with totalPages rounded up', () => {
    expect(toPage(['a'], 21, { page: 2, pageSize: 10 }).meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
    expect(toPage([], 0, { page: 1, pageSize: 10 }).meta.totalPages).toBe(0);
  });

  describe('resolveSort', () => {
    const allowed = { name: 'user.name', createdAt: 'user.createdAt' };
    const fallback = { field: 'createdAt' as const, direction: 'DESC' as const };

    it('falls back when no sort is given', () => {
      expect(resolveSort(undefined, allowed, fallback)).toEqual({
        column: 'user.createdAt',
        direction: 'DESC',
      });
    });

    it('maps a whitelisted field and direction', () => {
      expect(resolveSort('name:asc', allowed, fallback)).toEqual({
        column: 'user.name',
        direction: 'ASC',
      });
    });

    it('rejects fields outside the whitelist with a 400', () => {
      expect(() => resolveSort('password:asc', allowed, fallback)).toThrow(
        HttpException,
      );
      try {
        resolveSort('password:asc', allowed, fallback);
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(400);
      }
    });

    it('does not treat prototype keys as allowed', () => {
      expect(() => resolveSort('constructor:asc', allowed, fallback)).toThrow(
        HttpException,
      );
    });
  });
});

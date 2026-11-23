import { fromMinor, isMoney, normalizeMoney, toMinor } from './money';
import { normalizePhone } from './phone';
import { deletedSlug, isValidSlug, nextSlugCandidate, slugify } from './slug';

describe('money', () => {
  it.each([
    ['0', '0.00', 0],
    ['150', '150.00', 15000],
    ['150.5', '150.50', 15050],
    ['007.05', '7.05', 705],
    ['9999999999.99', '9999999999.99', 999999999999],
  ])('%s → %s (%i minor)', (input, normalized, minor) => {
    expect(normalizeMoney(input)).toBe(normalized);
    expect(toMinor(input)).toBe(minor);
    expect(fromMinor(minor)).toBe(normalized);
  });

  it.each(['', '-1', '1.234', '1,000', '1e3', ' 10', '12345678901', 'abc'])(
    'rejects %j',
    (input) => {
      expect(isMoney(input)).toBe(false);
    },
  );

  it('rejects non-integer or negative minor units', () => {
    expect(() => fromMinor(1.5)).toThrow(RangeError);
    expect(() => fromMinor(-1)).toThrow(RangeError);
  });
});

describe('phone', () => {
  it.each([
    ['0300 1234567', 'PK', '+923001234567'],
    ['+92 300 1234567', 'PK', '+923001234567'],
    ['021 3587 0000', 'PK', '+922135870000'],
    ['+44 20 7946 0958', 'PK', '+442079460958'],
    ['(212) 555-0142', 'US', '+12125550142'],
    ['12', 'PK', null],
    ['', 'PK', null],
    ['call me', 'PK', null],
  ])('%j in %s → %j', (input, country, expected) => {
    expect(normalizePhone(input, country)).toBe(expected);
  });
});

describe('slug', () => {
  it.each([
    ['Northern Trails', 'northern-trails'],
    ['  DHA Phase 6 ', 'dha-phase-6'],
    ['Gulshan-e-Iqbal', 'gulshan-e-iqbal'],
    ['Café Déjà', 'cafe-deja'],
    ['***', ''],
  ])('slugify(%j) → %j', (input, slug) => {
    expect(slugify(input)).toBe(slug);
    if (slug) expect(isValidSlug(slug)).toBe(true);
  });

  it('frees a soft-deleted slug within the column length', () => {
    expect(deletedSlug('clifton', 42, 80)).toBe('clifton--deleted-42');
    const long = deletedSlug('a'.repeat(80), 12345, 80);
    expect(long).toHaveLength(80);
    expect(long.endsWith('--deleted-12345')).toBe(true);
  });

  it('numbers candidates when a slug is taken', () => {
    expect(nextSlugCandidate('clifton', 2, 80)).toBe('clifton-2');
    expect(nextSlugCandidate('a'.repeat(80), 3, 80)).toHaveLength(80);
  });
});

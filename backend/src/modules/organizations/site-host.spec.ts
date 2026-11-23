import { isValidSlug, normalizeHost, slugFromPlatformSubdomain } from './site-host';

describe('site host helpers', () => {
  it.each([
    ['Northern-Trails.Example.com', 'northern-trails.example.com'],
    ['northern-trails.localhost:5173', 'northern-trails.localhost'],
    ['www.brand.com.', 'www.brand.com'],
    ['  localhost  ', 'localhost'],
  ])('normalizes %s', (raw, expected) => {
    expect(normalizeHost(raw)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    '',
    'bad host',
    'evil.com/path',
    '-start.com',
    'a..b',
    '[::1]:80',
  ])('rejects %p', (raw) => {
    expect(normalizeHost(raw as string)).toBeNull();
  });

  it.each([
    ['northern-trails.localhost', 'localhost', 'northern-trails'],
    ['silk-route-tours.platform.example', 'platform.example', 'silk-route-tours'],
    ['localhost', 'localhost', null],
    ['platform.example', 'platform.example', null],
    ['www.platform.example', 'platform.example', null],
    ['a.b.platform.example', 'platform.example', null],
    ['northern-trails.other.example', 'platform.example', null],
    ['notplatform.example', 'platform.example', null],
  ])('derives the slug for %s on %s', (host, platform, expected) => {
    expect(slugFromPlatformSubdomain(host, platform)).toBe(expected);
  });

  it('validates slugs', () => {
    expect(isValidSlug('northern-trails')).toBe(true);
    expect(isValidSlug('Northern-Trails')).toBe(false);
    expect(isValidSlug('northern--trails')).toBe(false);
    expect(isValidSlug('-northern')).toBe(false);
    expect(isValidSlug('a'.repeat(61))).toBe(false);
    expect(isValidSlug(42)).toBe(false);
  });
});

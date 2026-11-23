import { trustProxySetting } from './app.setup';
import { validateEnv } from './common/config/env.validation';

describe('trustProxySetting', () => {
  it('trusts nobody unless told to', () => {
    expect(trustProxySetting(undefined)).toBe(false);
    expect(trustProxySetting('')).toBe(false);
    expect(trustProxySetting('false')).toBe(false);
  });

  it('reads hop counts and subnet lists', () => {
    expect(trustProxySetting('1')).toBe(1);
    expect(trustProxySetting(' loopback, linklocal, uniquelocal ')).toBe(
      'loopback, linklocal, uniquelocal',
    );
  });
});

describe('TRUST_PROXY validation', () => {
  const base = {
    JWT_SECRET: 'x'.repeat(48),
    DATABASE_USER: 'u',
    DATABASE_PASS: 'p',
    DATABASE_NAME: 'd',
    DATABASE_HOST: 'localhost',
    ALLOWED_ORIGINS: 'http://localhost:5173',
  };
  const check = (TRUST_PROXY: string) => () => validateEnv({ ...base, TRUST_PROXY });

  it.each(['false', '1', 'loopback', 'loopback, linklocal, uniquelocal', '10.0.0.0/8'])(
    'accepts %s',
    (value) => {
      expect(check(value)).not.toThrow();
    },
  );

  it.each(['true', 'TRUE', 'yes please', '1; drop'])('refuses %s', (value) => {
    expect(check(value)).toThrow(/TRUST_PROXY/);
  });
});

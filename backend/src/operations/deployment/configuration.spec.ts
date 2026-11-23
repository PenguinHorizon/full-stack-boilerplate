import { deploymentConfiguration } from './configuration';

const failed = (values: Record<string, string>) =>
  deploymentConfiguration(values)
    .checks.filter((check) => !check.ok)
    .map((check) => check.id);

const production = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a-real-secret-that-is-long-enough-0123456789',
  DATABASE_HOST: 'db',
  DATABASE_NAME: 'rms',
  DATABASE_USER: 'rms',
  ALLOWED_ORIGINS: 'https://example.com',
  COOKIE_SECURE: 'true',
  PLATFORM_DOMAIN: 'example.com',
  APP_URL: 'https://example.com',
};

describe('deploymentConfiguration', () => {
  it('passes a complete production configuration', () => {
    expect(deploymentConfiguration(production).readyForHostValidation).toBe(true);
  });

  it('flags the production mistakes', () => {
    expect(
      failed({
        ...production,
        COOKIE_SECURE: 'false',
        PLATFORM_DOMAIN: 'localhost',
        APP_URL: 'http://example.com',
        SMTP_PASS: 'CHANGE_ME',
      }),
    ).toEqual([
      'cookies_secure',
      'platform_domain_set',
      'app_url_https',
      'no_placeholders',
    ]);
  });

  it('names placeholder settings without printing their values', () => {
    const result = deploymentConfiguration({ ...production, SMTP_PASS: 'CHANGE_ME' });
    const check = result.checks.find((c) => c.id === 'no_placeholders');
    expect(check?.message).toContain('SMTP_PASS');
  });

  it('leaves development alone', () => {
    expect(
      failed({
        ...production,
        NODE_ENV: 'development',
        COOKIE_SECURE: 'false',
        APP_URL: 'http://localhost:5173',
      }),
    ).toEqual([]);
  });
});

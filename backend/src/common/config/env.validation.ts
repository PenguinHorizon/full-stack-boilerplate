import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

const PLACEHOLDER_SECRETS = ['your_jwt_secret_key_here', 'changeme', 'secret'];

/** e.g. `15m`, `7d`, `900s`, `3600` */
const DURATION = /^\d+(ms|s|m|h|d|w|y)?$/;

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Transform(({ value }) => Number(value ?? 3003))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3003;

  /* ── Auth ─────────────────────────────────────────────────────────── */

  @IsString()
  @MinLength(32, {
    message:
      'JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48',
  })
  @Transform(({ value }) => {
    if (PLACEHOLDER_SECRETS.includes(String(value).trim().toLowerCase())) {
      throw new Error(
        'JWT_SECRET is still the example placeholder. Set a real secret before starting the app.',
      );
    }
    return value;
  })
  JWT_SECRET: string;

  @Matches(DURATION, {
    message: 'JWT_ACCESS_EXPIRES_IN must look like "15m" or "900s"',
  })
  JWT_ACCESS_EXPIRES_IN = '15m';

  @Matches(DURATION, { message: 'JWT_REFRESH_EXPIRES_IN must look like "7d"' })
  JWT_REFRESH_EXPIRES_IN = '7d';

  @IsString()
  @IsNotEmpty()
  JWT_ISSUER = 'fullstack-boilerplate';

  @IsString()
  @IsNotEmpty()
  JWT_AUDIENCE = 'fullstack-boilerplate-client';

  /** Storefront customer tokens: a separate audience, so they never pass as staff. */
  @IsString()
  @IsNotEmpty()
  CUSTOMER_JWT_AUDIENCE = 'app-storefront';

  @Matches(DURATION, { message: 'CUSTOMER_REFRESH_EXPIRES_IN must look like "30d"' })
  CUSTOMER_REFRESH_EXPIRES_IN = '30d';

  /* ── Database ─────────────────────────────────────────────────────── */

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST: string;

  @Transform(({ value }) => Number(value ?? 3306))
  @IsInt()
  @Min(1)
  @Max(65535)
  DATABASE_PORT = 3306;

  /*
   * TypeORM defaults to 10 retries at 3s, so a bad password hangs the boot for
   * ~30s before failing. Managed hosts that watchdog the first listen() report
   * that as "the app never started" and bury the real "Access denied" error.
   * Fail fast by default; raise it when the database starts alongside the app.
   */
  @Transform(({ value }) => Number(value ?? 3))
  @IsInt()
  @Min(0)
  @Max(50)
  DATABASE_RETRY_ATTEMPTS = 3;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASS: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME: string;

  /*
   * DATABASE_SYNC is intentionally gone: the schema is managed by migrations
   * only. DatabaseModule ignores the
   * variable and logs a warning if an old .env still sets it.
   */

  /* ── Platform ─────────────────────────────────────────────────────── */

  /**
   * Host of the platform itself. `{slug}.PLATFORM_DOMAIN` resolves to that
   * organization's storefront (ADR-003). `localhost` in development, where
   * `northern-trails.localhost:5173` works in every modern browser.
   */
  @IsString()
  @Matches(/^(localhost|([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$/, {
    message:
      'PLATFORM_DOMAIN must be a bare host name such as "localhost" or "platform.example.com"',
  })
  @Transform(({ value }) =>
    String(value ?? 'localhost')
      .trim()
      .toLowerCase(),
  )
  PLATFORM_DOMAIN = 'localhost';

  /* ── HTTP ─────────────────────────────────────────────────────────── */

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (String(value).includes('*')) {
      throw new Error(
        'ALLOWED_ORIGINS cannot contain "*" — CORS credentials mode requires explicit origins.',
      );
    }
    return value;
  })
  ALLOWED_ORIGINS: string;

  @IsString()
  @IsNotEmpty()
  APP_URL = 'http://localhost:5173';

  @IsBooleanString()
  COOKIE_SECURE = 'false';

  @IsIn(['lax', 'strict', 'none'])
  COOKIE_SAMESITE = 'lax';

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  /**
   * Proxies allowed to report the client address (see app.setup.ts):
   * "loopback, linklocal, uniquelocal" behind Docker's nginx, or a hop count.
   */
  @IsOptional()
  @Matches(/^(false|\d{1,2}|(?!true$)[a-z0-9.:/]+(\s*,\s*[a-z0-9.:/]+)*)$/i, {
    message:
      'TRUST_PROXY must be a hop count, subnet names/CIDRs (e.g. "loopback, uniquelocal"), or false — never "true"',
  })
  TRUST_PROXY?: string;

  /* ── Mail (optional; falls back to a console transport) ───────────── */

  @IsOptional() @IsString() SMTP_HOST?: string;
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  SMTP_PORT?: number;
  @IsOptional() @IsString() SMTP_USER?: string;
  @IsOptional() @IsString() SMTP_PASS?: string;
  @IsOptional() @IsString() SMTP_FROM?: string;

  /* ── Media ────────────────────────────────────────────────────────── */

  /** Where new uploads go. Existing images keep their own provider. */
  @IsIn(['local', 'cloudinary'])
  MEDIA_STORAGE = 'local';

  /** Largest accepted image, in megabytes. */
  @Transform(({ value }) => (value === undefined || value === '' ? 5 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(20)
  MEDIA_MAX_IMAGE_MB = 5;

  /* ── Cloudinary (optional) ────────────────────────────────────────── */

  @IsOptional() @IsString() CLOUDINARY_CLOUD_NAME?: string;
  @IsOptional() @IsString() CLOUDINARY_API_KEY?: string;
  @IsOptional() @IsString() CLOUDINARY_API_SECRET?: string;

  /* ── Seeding ──────────────────────────────────────────────────────── */

  @IsOptional() @IsString() SEED_ADMIN_EMAIL?: string;
  @IsOptional() @IsString() SEED_ADMIN_PASSWORD?: string;
}

/**
 * Fails the boot rather than letting a typo'd or missing variable become a
 * runtime mystery. Every env-name mismatch found in this codebase
 * (`SMTP_SERV`, `CORS_ALLOWED_ORIGINS`, `EMAIL_DOMAIN`) failed silently.
 */
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
    excludeExtraneousValues: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length) {
    const details = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return validated;
}

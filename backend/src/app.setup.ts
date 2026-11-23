import { INestApplication, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';

export const API_PREFIX = 'api';
export const API_VERSION = '1';

/**
 * Which proxies may report the client's address (X-Forwarded-For). Behind
 * nginx every request otherwise comes *from nginx*: one rate-limit bucket for
 * the whole platform, and the proxy's address in audit logs and orders.
 *
 *   TRUST_PROXY=loopback, linklocal, uniquelocal  private networks (Docker, LAN)
 *   TRUST_PROXY=1                                  exactly one proxy hop
 *   unset or "false"                               the API is reached directly
 *
 * "true" (trust any hop) is refused by env validation: clients could then
 * send their own X-Forwarded-For and dodge rate limits.
 */
export function trustProxySetting(
  value: string | undefined,
): boolean | number | string {
  const setting = value?.trim();
  if (!setting || setting === 'false') return false;
  if (/^\d+$/.test(setting)) return Number(setting);
  return setting;
}

/**
 * Everything that changes request routing or parsing, shared by `main.ts` and
 * the e2e harness so tests exercise the same URLs as production:
 *   /api/v1/...      versioned routes (ADR-009)
 *   /api/health/...  version-neutral (see HealthController)
 */
export function configureApp(app: INestApplication): INestApplication {
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', trustProxySetting(process.env.TRUST_PROXY));
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_VERSION });
  app.use(cookieParser());
  return app;
}

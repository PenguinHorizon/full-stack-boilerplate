import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import {
  OrganizationRole,
  OrganizationStatus,
} from '../src/common/constants/tenancy.enums';
import { hashPassword } from '../src/common/helpers/password.helper';
import { OrganizationUser } from '../src/database/entities/identity/organization-user.entity';
import { User } from '../src/database/entities/identity/user.entity';
import { Organization } from '../src/database/entities/tenancy/organization.entity';
import { OrganizationSettings } from '../src/database/entities/tenancy/organization-settings.entity';

/**
 * Boots the real AppModule — global pipes, guards, interceptors and filter
 * included — through the same `configureApp()` as main.ts, so the e2e suite
 * exercises the real URLs (/api/v1/..., version-neutral /api/health).
 *
 * Requires a reachable MySQL with the schema migrated. CI provides one via a
 * `mysql:8` service container; see .github/workflows/ci.yml.
 */
export async function createTestApp(
  options: { throttle?: boolean } = {},
): Promise<INestApplication> {
  /*
   * Functional specs exercise many auth requests in quick succession, which the
   * 5-per-minute limit on those routes would otherwise turn into a wall of 429s
   * that looks like a product failure. Rate limiting is not skipped silently:
   * throttling.e2e-spec.ts passes `{ throttle: true }` and asserts it fires.
   */
  process.env.THROTTLE_DISABLED = options.throttle ? 'false' : 'true';

  /*
   * NestFactory, like main.ts, rather than Test.createTestingModule: the
   * testing module instantiates providers before the HTTP adapter exists, and
   * @nestjs/serve-static then silently installs a no-op loader, so /uploads
   * would 404 in tests only.
   */
  const app = configureApp(
    await NestFactory.create(AppModule, { logger: ['error', 'warn'] }),
  );
  await app.init();
  return app;
}

/** Tables emptied between tests. Children first is not required (FK checks off). */
const TABLES = [
  'notifications',
  'customer_refresh_tokens',
  'customers',
  'inquiries',
  'website_sections',
  'banners',
  'gallery_images',
  'testimonials',
  'faqs',
  'pages',
  'refresh_tokens',
  'audit_logs',
  'organization_users',
  'organization_domains',
  'organization_settings',
  'organizations',
  'media_assets',
  'users',
];

export async function truncateAll(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES) {
    await dataSource.query(`TRUNCATE TABLE \`${table}\``);
  }
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
}

/** Pulls the refresh cookie out of a Set-Cookie header list. */
export function refreshCookie(headers: Record<string, unknown>): string | undefined {
  const raw = headers['set-cookie'] as string[] | undefined;
  return raw?.find((cookie) => cookie.startsWith('refresh_token='));
}

/* ── Fixtures (staff are created by admins, not self-registration) ── */

export const TEST_PASSWORD = 'Password123';

export async function createUser(
  app: INestApplication,
  input: { email: string; name?: string; isSuperAdmin?: boolean; isActive?: boolean },
): Promise<User> {
  const repo = app.get(DataSource).getRepository(User);
  const user = await repo.save(
    repo.create({
      email: input.email,
      name: input.name ?? input.email.split('@')[0],
      password: await hashPassword(TEST_PASSWORD),
      isSuperAdmin: input.isSuperAdmin ?? false,
      isActive: input.isActive ?? true,
    }),
  );
  await repo.update(user.id, { userCode: `USR${String(user.id).padStart(6, '0')}` });
  return user;
}

export async function createOrganization(
  app: INestApplication,
  slug: string,
  status: OrganizationStatus = OrganizationStatus.Active,
): Promise<number> {
  const ds = app.get(DataSource);
  const organization = await ds
    .getRepository(Organization)
    .save({ slug, name: `Organization ${slug}`, status, city: 'Karachi' });
  await ds
    .getRepository(OrganizationSettings)
    .save({ organizationId: organization.id });
  return organization.id;
}

export async function addMember(
  app: INestApplication,
  organizationId: number,
  userId: number,
  role: OrganizationRole,
): Promise<number> {
  const membership = await app
    .get(DataSource)
    .getRepository(OrganizationUser)
    .save({ organizationId, userId, role, isActive: true });
  return membership.id;
}

/** Signs in and returns the bearer access token. */
export async function signIn(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: TEST_PASSWORD });
  if (res.status !== 200) {
    throw new Error(
      `Sign-in failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data.accessToken as string;
}

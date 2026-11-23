import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  PERMISSIONS,
  permissionsFor,
  type Permission,
} from '../src/common/constants/roles.config';
import { MediaProvider, OrganizationRole } from '../src/common/constants/tenancy.enums';
import { Customer } from '../src/database/entities/customers/customer.entity';
import { MediaAsset } from '../src/database/entities/platform/media-asset.entity';
import { Inquiry } from '../src/database/entities/website/inquiry.entity';
import { checkConsistency } from '../src/database/consistency';
import { describeRoute, discoverRoutes, type DiscoveredRoute } from './routes';
import {
  addMember,
  createOrganization,
  createTestApp,
  createUser,
  signIn,
  truncateAll,
} from './setup-e2e';

/*
 * QA sweep. Every check here is driven by the routes Nest actually serves
 * (read from controller metadata), so a route added later is covered without
 * editing this file:
 *
 * - the permission each route declares is the one enforced, for every role;
 * - no route answers 5xx to malformed bodies, ids or query strings, and every
 *   error uses the documented envelope;
 * - another organization's records are invisible through your own :orgId.
 */

const GUARD_REFUSAL = 'Insufficient permissions';
const MISSING_ID = 999999;
const WRITE_METHODS = new Set(['post', 'put', 'patch']);
/** These end the caller's own session, which would make the rest of a sweep shallow. */
const SESSION_ENDING = /\/(logout|logout-all)$/;

/** Permissions not attached to a route, and why (anything else unused fails the suite). */
const NOT_ON_A_ROUTE: Partial<Record<Permission, string>> = {
  'organization.domains': 'reserved for a custom-domains screen',
};
/** Organization routes that change data without a permission, and why. */
const PERSONAL_WRITES: Record<string, string> = {
  'POST /admin/organizations/:orgId/notifications/read-all':
    "the caller's own notifications",
  'POST /admin/organizations/:orgId/notifications/:id/read':
    "the caller's own notifications",
};

type Res = request.Response;

describe('QA sweep (e2e)', () => {
  let app: INestApplication;
  let http: () => request.Agent;
  let ds: DataSource;
  let routes: DiscoveredRoute[];
  let orgIdA: number;
  let orgIdB: number;

  const send = (
    method: DiscoveredRoute['method'],
    path: string,
    token?: string,
    body?: unknown,
  ) => {
    let req = http()[method](path);
    if (token) req = req.set('Authorization', `Bearer ${token}`);
    if (body !== undefined && WRITE_METHODS.has(method)) {
      req =
        typeof body === 'string'
          ? req.set('Content-Type', 'application/json').send(body)
          : req.send(body as object);
    }
    return req;
  };

  /** Fills `:orgId`, the organization `:slug`, and every other parameter with `other`. */
  const fill = (path: string, other: string | number, slug = 'qa-a') =>
    `/api/v1${path
      .replace(':orgId', String(orgIdA))
      .replace(':slug', slug)
      .replace(/:[A-Za-z]+/g, String(other))}`;

  const member = async (email: string, role: OrganizationRole, orgId = orgIdA) => {
    const user = await createUser(app, { email });
    await addMember(app, orgId, user.id, role);
    return signIn(app, email);
  };

  /** The documented error envelope. */
  const envelopeProblem = (res: Res): string | null => {
    const body = res.body as Record<string, unknown>;
    if (body?.success !== false) return 'success is not false';
    if (body.statusCode !== res.status) return `statusCode ${String(body.statusCode)}`;
    if (typeof body.code !== 'string' || !body.code) return 'no code';
    if (typeof body.message !== 'string' || !body.message) return 'no message';
    if (typeof body.path !== 'string') return 'no path';
    return null;
  };

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());
    ds = app.get(DataSource);
    routes = discoverRoutes(app);
  });

  beforeEach(async () => {
    await truncateAll(app);
    orgIdA = await createOrganization(app, 'qa-a');
    orgIdB = await createOrganization(app, 'qa-b');
    await ds.query(
      'UPDATE organization_settings SET website_enabled = 1 WHERE organization_id IN (?, ?)',
      [orgIdA, orgIdB],
    );
  });
  afterAll(() => app.close());

  /* ── Permissions ─────────────────────────────────────────────────── */

  describe('permissions', () => {
    it('guards every permission in the catalogue with at least one route', () => {
      const used = new Set(routes.flatMap((route) => route.permissions));
      const unused = PERMISSIONS.filter((p) => !used.has(p) && !NOT_ON_A_ROUTE[p]);
      expect(unused).toEqual([]);
      // An exception that is now on a route should be removed from the list.
      expect(
        Object.keys(NOT_ON_A_ROUTE).filter((p) => used.has(p as Permission)),
      ).toEqual([]);
    });

    it('requires a permission on every organization route that changes data', () => {
      const unguarded = routes
        .filter((r) => r.scoped && r.method !== 'get' && r.permissions.length === 0)
        .map(describeRoute)
        .filter((route) => !PERSONAL_WRITES[route]);
      expect(unguarded).toEqual([]);
    });

    it('declares permissions only on organization-scoped routes', () => {
      // PermissionsGuard fails closed without a tenant; this catches the wiring mistake early.
      const misplaced = routes
        .filter((r) => r.permissions.length > 0 && !r.scoped)
        .map(describeRoute);
      expect(misplaced).toEqual([]);
    });

    it.each(Object.values(OrganizationRole))(
      'enforces each route’s declared permissions for %s',
      async (role) => {
        const token = await member(`${role.toLowerCase()}@x.test`, role, orgIdA);
        const granted = new Set<Permission>(permissionsFor(role));
        const wrong: string[] = [];
        const crashed: string[] = [];

        for (const route of routes.filter((r) => r.scoped)) {
          // A missing id: allowed callers get a 4xx from the handler, never a real change.
          const res = await send(route.method, fill(route.path, MISSING_ID), token, {});
          const refused = res.status === 403 && res.body?.message === GUARD_REFUSAL;
          const shouldRefuse = !route.permissions.every((p) => granted.has(p));
          if (refused !== shouldRefuse) {
            wrong.push(
              `${describeRoute(route)} needs [${route.permissions.join(', ')}] → ${res.status}`,
            );
          }
          if (res.status >= 500)
            crashed.push(`${describeRoute(route)} → ${res.status}`);
        }
        expect({ role, wrong, crashed }).toEqual({ role, wrong: [], crashed: [] });
      },
    );
  });

  /* ── Robustness ──────────────────────────────────────────────────── */

  describe('robustness', () => {
    it('never answers 5xx to malformed bodies, ids or queries, and always uses the error envelope', async () => {
      const owner = await member('owner@x.test', OrganizationRole.Owner, orgIdA);
      await createUser(app, { email: 'root@x.test', isSuperAdmin: true });
      const root = await signIn(app, 'root@x.test');

      const bodies: unknown[] = [
        [],
        { unexpected: true, name: { nested: 1 } },
        '{"broken":',
      ];
      const ids = ['abc', '-1', '99999999999999999999', '1.5'];
      const query =
        '?page=-5&pageSize=100000&sort=name;DROP&q=%27%22%3Cx%3E&status=abc';
      const failures: string[] = [];
      let requests = 0;

      const check = (route: DiscoveredRoute, variant: string, res: Res) => {
        requests += 1;
        if (res.status >= 500) {
          failures.push(`${describeRoute(route)} [${variant}] → ${res.status}`);
          return;
        }
        if (res.status >= 400) {
          const problem = envelopeProblem(res);
          if (problem) {
            failures.push(
              `${describeRoute(route)} [${variant}] → ${res.status}: ${problem}`,
            );
          }
        }
      };

      for (const route of routes) {
        if (SESSION_ENDING.test(route.path)) continue;
        const token = route.platformOnly ? root : route.isPublic ? undefined : owner;
        for (const id of ids) {
          check(
            route,
            `id ${id}`,
            await send(route.method, fill(route.path, id), token, {}),
          );
        }
        if (route.method === 'get') {
          check(
            route,
            'query',
            await send(route.method, `${fill(route.path, 1)}${query}`, token),
          );
        } else if (WRITE_METHODS.has(route.method)) {
          for (const body of bodies) {
            const label =
              typeof body === 'string' ? 'broken JSON' : JSON.stringify(body);
            check(
              route,
              label,
              await send(route.method, fill(route.path, 1), token, body),
            );
          }
        }
      }

      for (const path of ['/api/v1/nope', '/api/v1/admin/organizations/abc/team']) {
        const res = await http().get(path).set('Authorization', `Bearer ${owner}`);
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
        expect(envelopeProblem(res)).toBeNull();
      }

      expect(requests).toBeGreaterThan(routes.length * 4);
      expect(failures).toEqual([]);
    });
  });

  /* ── Organization isolation (records) ──────────────────────────────── */

  describe('organization isolation', () => {
    const mediaOf = async (orgId: number, name: string) =>
      (
        await ds.getRepository(MediaAsset).save({
          organizationId: orgId,
          provider: MediaProvider.Local,
          storageKey: `r/${orgId}/${name}.jpg`,
          url: `/uploads/r/${orgId}/${name}.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: 1000,
          width: 1600,
          height: 900,
        })
      ).id;

    it("treats every kind of another organization's record as non-existent through your own :orgId", async () => {
      const ownerA = await member('owner-a@x.test', OrganizationRole.Owner, orgIdA);
      const ownerB = await member('owner-b@x.test', OrganizationRole.Owner, orgIdB);
      const asB = (method: 'post' | 'get', path: string, body?: object) =>
        send(method, `/api/v1/admin/organizations/${orgIdB}${path}`, ownerB, body);
      const created = async (path: string, body: object) => {
        const res = await asB('post', path, body);
        if (res.status !== 201) throw new Error(`${path}: ${JSON.stringify(res.body)}`);
        return res.body.data.id as number;
      };

      // Organization B: one record of every kind staff can address by id.
      const media = await mediaOf(orgIdB, 'b');
      const faq = await created('/content/faqs', {
        category: 'General',
        question: 'B?',
        answer: 'B.',
        status: 'published',
      });
      const testimonial = await created('/content/testimonials', {
        authorName: 'B fan',
        quote: 'Great.',
        status: 'published',
      });
      const banner = await created('/content/banners', {
        placement: 'hero',
        internalName: 'B banner',
        desktopMediaId: media,
        status: 'published',
      });
      const gallery = await created('/content/gallery', {
        mediaId: media,
        status: 'published',
      });
      const customer = (
        await ds.getRepository(Customer).save({
          organizationId: orgIdB,
          name: 'B customer',
          phone: '+923001112233',
        })
      ).id;
      const inquiry = (
        await ds.getRepository(Inquiry).save({
          organizationId: orgIdB,
          name: 'B visitor',
          message: 'Hello',
        })
      ).id;
      const memberB = await createUser(app, { email: 'member-b@x.test' });
      const membership = await addMember(
        app,
        orgIdB,
        memberB.id,
        OrganizationRole.Member,
      );

      /** Which of B's ids each path parameter stands for, by the segment before it. */
      const idFor = (segment: string): number | null => {
        const bySegment: Record<string, number> = {
          media,
          faqs: faq,
          testimonials: testimonial,
          banners: banner,
          gallery,
          customers: customer,
          inquiries: inquiry,
          team: membership,
        };
        return bySegment[segment] ?? null;
      };

      const leaks: string[] = [];
      let probed = 0;
      for (const route of routes.filter((r) => r.scoped)) {
        const parts = route.path.split('/');
        let resolvable = true;
        let hasId = false;
        const filled = parts.map((part, i) => {
          if (!part.startsWith(':') || part === ':orgId') return part;
          hasId = true;
          const id = idFor(parts[i - 1] ?? '');
          if (id === null) resolvable = false;
          return String(id);
        });
        if (!hasId || !resolvable) continue;
        probed += 1;
        const path = `/api/v1${filled.join('/').replace(':orgId', String(orgIdA))}`;
        const res = await send(route.method, path, ownerA, {});
        const bodyless = route.method === 'get' || route.method === 'delete';
        // Reads and deletes must say "not found"; writes may stop earlier at validation.
        if (res.status < 300 || (bodyless && res.status !== 404)) {
          leaks.push(`${describeRoute(route)} → ${res.status}`);
        }
      }
      expect(probed).toBeGreaterThan(10);
      expect(leaks).toEqual([]);

      // Nothing of B's was touched.
      expect((await asB('get', `/customers/${customer}`)).status).toBe(200);
      const faqs = await asB('get', '/content/faqs');
      expect(faqs.body.data.map((f: { id: number }) => f.id)).toEqual([faq]);
    });

    it("refuses another organization's records inside your own requests (422)", async () => {
      const ownerA = await member('owner-a@x.test', OrganizationRole.Owner, orgIdA);
      const mediaB = await mediaOf(orgIdB, 'b');
      const a = (path: string) => `/api/v1/admin/organizations/${orgIdA}${path}`;

      const banner = await send('post', a('/content/banners'), ownerA, {
        placement: 'hero',
        internalName: 'Sneaky',
        desktopMediaId: mediaB,
        status: 'published',
      });
      expect(banner.status).toBe(422);
      expect(banner.body.code).toBe('INVALID_REFERENCE');

      const profile = await send('patch', a(''), ownerA, { logoMediaId: mediaB });
      expect(profile.status).toBe(422);
      expect(profile.body.code).toBe('INVALID_REFERENCE');
    });
  });

  /* ── Database consistency ────────────────────────────────────────── */

  describe('database consistency', () => {
    const run = () => checkConsistency((sql, params) => ds.query(sql, params));

    it('passes on a clean database and flags each kind of broken rule', async () => {
      await member('owner-a@x.test', OrganizationRole.Owner, orgIdA);
      await member('owner-b@x.test', OrganizationRole.Owner, orgIdB);
      const first = await run();
      expect(first.checks).toBeGreaterThan(5);
      expect(first.issues).toEqual([]);

      // Break one rule of each family, directly in the database.
      const mediaB = await ds.query(
        `INSERT INTO media_assets (organization_id, provider, storage_key, url, mime_type, size_bytes)
         VALUES (?, 'local', 'r/b/x.jpg', '/uploads/r/b/x.jpg', 'image/jpeg', 10)`,
        [orgIdB],
      );
      await ds.query('UPDATE organizations SET logo_media_id = ? WHERE id = ?', [
        mediaB.insertId,
        orgIdA,
      ]);
      await ds.query(
        `INSERT INTO gallery_images (organization_id, media_id, status) VALUES (?, ?, 'published')`,
        [orgIdA, mediaB.insertId],
      );
      await ds.query(
        'UPDATE organization_users SET is_active = 0 WHERE organization_id = ?',
        [orgIdB],
      );
      await ds.query('DELETE FROM organization_settings WHERE organization_id = ?', [
        orgIdB,
      ]);

      const found = (await run()).issues.map((issue) => issue.check);
      expect(found).toEqual(
        expect.arrayContaining([
          'organizations.media',
          'gallery_images.media_id',
          'organization_users.owner',
          'organization_settings.exists',
        ]),
      );
    });
  });
});

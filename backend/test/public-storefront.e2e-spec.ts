import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { OrganizationStatus } from '../src/common/constants/tenancy.enums';
import { createTestApp, truncateAll } from './setup-e2e';

/**
 * Public storefront API: bootstrap, directory, host resolution,
 * the "not available" rule, and the error/versioning conventions.
 */
describe('Public storefront (e2e)', () => {
  let app: INestApplication;
  let http: () => request.Agent;

  async function createOrganization(
    slug: string,
    options: {
      status?: OrganizationStatus;
      websiteEnabled?: boolean;
    } = {},
  ) {
    const dataSource = app.get(DataSource);
    const result = await dataSource.query(
      'INSERT INTO organizations (slug, name, status, city, brand_primary_color) VALUES (?, ?, ?, ?, ?)',
      [
        slug,
        `Organization ${slug}`,
        options.status ?? OrganizationStatus.Active,
        'Islamabad',
        '#1F5C4A',
      ],
    );
    await dataSource.query(
      'INSERT INTO organization_settings (organization_id, website_enabled) VALUES (?, ?)',
      [result.insertId, options.websiteEnabled ?? true],
    );
    return result.insertId as number;
  }

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());
  });

  beforeEach(() => truncateAll(app));
  afterAll(() => app.close());

  it('returns the storefront bootstrap for an active organization', async () => {
    await createOrganization('northern-trails');

    const res = await http().get('/api/v1/public/organizations/northern-trails');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toMatch(/public, max-age=30/);
    expect(res.body.data.organization).toEqual(
      expect.objectContaining({
        slug: 'northern-trails',
        brand: { primary: '#1F5C4A', accent: null },
      }),
    );
    expect(res.body.data.navigation).toEqual({ pages: [] });
  });

  it('never exposes internal columns in public responses', async () => {
    await createOrganization('northern-trails');
    const body = JSON.stringify(
      (await http().get('/api/v1/public/organizations/northern-trails')).body,
    );
    expect(body).not.toMatch(/createdBy|created_by|deletedAt|organizationId|"id"/);
  });

  it.each([
    ['draft', { status: OrganizationStatus.Draft }],
    ['suspended', { status: OrganizationStatus.Suspended }],
    ['website disabled', { websiteEnabled: false }],
  ])(
    'treats a %s organization exactly like an unknown one',
    async (_label, options) => {
      await createOrganization('hidden-place', options);

      const hidden = await http().get('/api/v1/public/organizations/hidden-place');
      const unknown = await http().get('/api/v1/public/organizations/no-such-place');

      for (const res of [hidden, unknown]) {
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('ORGANIZATION_UNAVAILABLE');
        expect(res.body.message).toBe('This organization website is not available.');
      }
    },
  );

  it('lists only publicly available organizations in the directory, with page meta', async () => {
    await createOrganization('alpha');
    await createOrganization('bravo');
    await createOrganization('draft-one', { status: OrganizationStatus.Draft });

    const res = await http().get('/api/v1/public/organizations?pageSize=1');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.meta).toEqual({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('treats LIKE wildcards in the search term literally', async () => {
    await createOrganization('alpha');
    const res = await http().get('/api/v1/public/organizations?q=%25');
    expect(res.body.data.meta.total).toBe(0);
  });

  it('resolves a platform subdomain and rejects the bare platform host', async () => {
    await createOrganization('northern-trails');

    const sub = await http().get(
      '/api/v1/public/sites/resolve?host=northern-trails.localhost:5173',
    );
    expect(sub.status).toBe(200);
    expect(sub.body.data).toEqual({
      organizationSlug: 'northern-trails',
      basePath: '/',
    });

    const bare = await http().get('/api/v1/public/sites/resolve?host=localhost');
    expect(bare.status).toBe(404);
  });

  it('resolves a registered custom domain', async () => {
    const id = await createOrganization('northern-trails');
    await app
      .get(DataSource)
      .query(
        'INSERT INTO organization_domains (organization_id, hostname) VALUES (?, ?)',
        [id, 'www.northern-trails.example'],
      );

    const res = await http().get(
      '/api/v1/public/sites/resolve?host=WWW.Northern-Trails.example',
    );
    expect(res.body.data.organizationSlug).toBe('northern-trails');
  });

  it('allows edge TLS certificates only for hosts the platform serves', async () => {
    const id = await createOrganization('northern-trails');
    const ds = app.get(DataSource);
    await ds.query(
      'INSERT INTO organization_domains (organization_id, hostname, verified_at) VALUES (?, ?, NOW())',
      [id, 'order.northern-trails.example'],
    );
    await ds.query(
      'INSERT INTO organization_domains (organization_id, hostname) VALUES (?, ?)',
      [id, 'pending.northern-trails.example'],
    );
    const check = (domain: string) =>
      http().get(`/api/v1/public/sites/tls-check?domain=${encodeURIComponent(domain)}`);

    // The platform, an existing organization's subdomain, a verified custom domain.
    for (const allowed of [
      'localhost',
      'northern-trails.localhost',
      'Order.Northern-Trails.example',
    ]) {
      expect({ allowed, status: (await check(allowed)).status }).toEqual({
        allowed,
        status: 200,
      });
    }
    // Unknown subdomains, unverified domains and strangers' names get nothing.
    for (const refused of [
      'no-such-place.localhost',
      'pending.northern-trails.example',
      'evil.test',
    ]) {
      expect({ refused, status: (await check(refused)).status }).toEqual({
        refused,
        status: 404,
      });
    }
    expect((await http().get('/api/v1/public/sites/tls-check')).status).toBe(400);
    expect((await check('bad host/../x')).status).toBe(400);
  });

  it('returns field-level validation errors with a request id', async () => {
    const res = await http()
      .get('/api/v1/public/organizations?pageSize=500')
      .set('X-Request-Id', 'test-request-0001');

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        code: 'VALIDATION_FAILED',
        requestId: 'test-request-0001',
        errors: [expect.objectContaining({ field: 'pageSize' })],
      }),
    );
    expect(res.headers['x-request-id']).toBe('test-request-0001');
  });

  it('serves only versioned routes (health stays version-neutral)', async () => {
    expect((await http().get('/api/public/organizations')).status).toBe(404);
    expect((await http().get('/api/health/live')).status).toBe(200);
  });
});

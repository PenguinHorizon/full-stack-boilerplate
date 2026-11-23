import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { permissionsFor, type Permission } from '../src/common/constants/roles.config';
import { OrganizationRole } from '../src/common/constants/tenancy.enums';
import {
  addMember,
  createOrganization,
  createTestApp,
  createUser,
  signIn,
  truncateAll,
} from './setup-e2e';
import { discoverRoutes, fillPath, type DiscoveredRoute } from './routes';

type Route = Pick<DiscoveredRoute, 'method' | 'path'>;

const url = (path: string, orgId: number) => fillPath(path, orgId, 1);

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let http: () => request.Agent;
  let routes: DiscoveredRoute[];
  let organizationA: number;
  let organizationB: number;

  const send = (route: Route, path: string, token?: string) => {
    const req = http()[route.method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());
    routes = discoverRoutes(app);
  });

  beforeEach(async () => {
    await truncateAll(app);
    organizationA = await createOrganization(app, 'organization-a');
    organizationB = await createOrganization(app, 'organization-b');
  });
  afterAll(() => app.close());

  it('discovers the organization-scoped routes (sanity check — grows with every feature)', () => {
    const scoped = routes.filter((r) => r.scoped).map((r) => `${r.method} ${r.path}`);
    expect(scoped).toEqual(
      expect.arrayContaining([
        'get /admin/organizations/:orgId',
        'get /admin/organizations/:orgId/dashboard',
        'get /admin/organizations/:orgId/audit-logs',
        'get /admin/organizations/:orgId/team',
        'post /admin/organizations/:orgId/team',
        'patch /admin/organizations/:orgId/team/:membershipId',
        'delete /admin/organizations/:orgId/team/:membershipId',
        'post /admin/organizations/:orgId/team/:membershipId/password-reset',
        'patch /admin/organizations/:orgId',
        'patch /admin/organizations/:orgId/settings',
        'get /admin/organizations/:orgId/media',
        'post /admin/organizations/:orgId/media',
        'delete /admin/organizations/:orgId/media/:id',
        'get /admin/organizations/:orgId/content/faqs',
        'get /admin/organizations/:orgId/customers',
        'get /admin/organizations/:orgId/inquiries',
        'get /admin/organizations/:orgId/notifications',
      ]),
    );
  });

  it('marks every /admin/organizations/:orgId route as organization-scoped', () => {
    const unguarded = routes.filter(
      (r) => r.path.startsWith('/admin/organizations/:orgId') && !r.scoped,
    );
    expect(unguarded).toEqual([]);
  });

  it('refuses anonymous callers on every organization route (401)', async () => {
    for (const route of routes.filter((r) => r.scoped)) {
      const res = await send(route, url(route.path, organizationA));
      expect({ route: `${route.method} ${route.path}`, status: res.status }).toEqual({
        route: `${route.method} ${route.path}`,
        status: 401,
      });
    }
  });

  it("refuses another organization's owner on every route of this one (403)", async () => {
    const ownerB = await createUser(app, { email: 'owner-b@x.test' });
    await addMember(app, organizationB, ownerB.id, OrganizationRole.Owner);
    const token = await signIn(app, 'owner-b@x.test');

    for (const route of routes.filter((r) => r.scoped)) {
      const res = await send(route, url(route.path, organizationA), token);
      expect({ route: `${route.method} ${route.path}`, status: res.status }).toEqual({
        route: `${route.method} ${route.path}`,
        status: 403,
      });
    }
  });

  it('answers 403 identically for an organization that does not exist', async () => {
    const owner = await createUser(app, { email: 'owner@x.test' });
    await addMember(app, organizationA, owner.id, OrganizationRole.Owner);
    const token = await signIn(app, 'owner@x.test');
    const res = await http()
      .get('/api/v1/admin/organizations/999999/team')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("treats another organization's records as non-existent (404) through your own :orgId", async () => {
    const ownerA = await createUser(app, { email: 'owner-a@x.test' });
    await addMember(app, organizationA, ownerA.id, OrganizationRole.Owner);
    const staffB = await createUser(app, { email: 'staff-b@x.test' });
    const membershipB = await addMember(
      app,
      organizationB,
      staffB.id,
      OrganizationRole.Member,
    );
    const token = await signIn(app, 'owner-a@x.test');

    const res = await http()
      .patch(`/api/v1/admin/organizations/${organizationA}/team/${membershipB}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false });
    expect(res.status).toBe(404);
  });

  /*
   * Permission matrix, end to end: for every role, each probe must be allowed
   * exactly when ROLE_PERMISSIONS grants the permission (guards run before
   * validation, so "allowed" means anything but 403 — e.g. 400 for an empty body).
   */
  const PROBES: Array<{
    permission: Permission;
    method: Route['method'];
    path: string;
  }> = [
    {
      permission: 'organization.view',
      method: 'get',
      path: '/admin/organizations/:orgId',
    },
    {
      permission: 'team.view',
      method: 'get',
      path: '/admin/organizations/:orgId/team',
    },
    {
      permission: 'team.manage',
      method: 'post',
      path: '/admin/organizations/:orgId/team',
    },
    {
      permission: 'dashboard.view',
      method: 'get',
      path: '/admin/organizations/:orgId/dashboard',
    },
    {
      permission: 'audit.view',
      method: 'get',
      path: '/admin/organizations/:orgId/audit-logs',
    },
    {
      permission: 'organization.update',
      method: 'patch',
      path: '/admin/organizations/:orgId',
    },
    {
      permission: 'media.view',
      method: 'get',
      path: '/admin/organizations/:orgId/media',
    },
    {
      permission: 'media.upload',
      method: 'post',
      path: '/admin/organizations/:orgId/media',
    },
    {
      permission: 'media.delete',
      method: 'delete',
      path: '/admin/organizations/:orgId/media/:id',
    },
    {
      permission: 'content.view',
      method: 'get',
      path: '/admin/organizations/:orgId/content/faqs',
    },
    {
      permission: 'content.manage',
      method: 'post',
      path: '/admin/organizations/:orgId/content/faqs',
    },
    {
      permission: 'customer.view',
      method: 'get',
      path: '/admin/organizations/:orgId/customers',
    },
    {
      permission: 'customer.manage',
      method: 'patch',
      path: '/admin/organizations/:orgId/customers/:id',
    },
    {
      permission: 'inquiry.view',
      method: 'get',
      path: '/admin/organizations/:orgId/inquiries',
    },
  ];

  it.each(Object.values(OrganizationRole))(
    'enforces the documented permissions for %s',
    async (role) => {
      const user = await createUser(app, { email: `${role.toLowerCase()}@x.test` });
      await addMember(app, organizationA, user.id, role);
      const token = await signIn(app, user.email);
      const granted = permissionsFor(role);

      for (const probe of PROBES) {
        const res = await send(probe, url(probe.path, organizationA), token);
        const allowed = res.status !== 403;
        expect({ role, probe: probe.permission, allowed }).toEqual({
          role,
          probe: probe.permission,
          allowed: granted.includes(probe.permission),
        });
      }
    },
  );
});

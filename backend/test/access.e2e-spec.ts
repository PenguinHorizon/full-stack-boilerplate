import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  OrganizationRole,
  OrganizationStatus,
} from '../src/common/constants/tenancy.enums';
import {
  addMember,
  createOrganization,
  createTestApp,
  createUser,
  signIn,
  TEST_PASSWORD,
  truncateAll,
} from './setup-e2e';

const { Owner, Admin, Manager, Member } = OrganizationRole;

/**
 * Access model: memberships, team rules and platform
 * administration, against a real database.
 */
describe('Access, team and platform (e2e)', () => {
  let app: INestApplication;
  let http: () => request.Agent;
  let orgId: number;

  const as = (token: string) => ({
    get: (url: string) => http().get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string, body?: object) =>
      http().post(url).set('Authorization', `Bearer ${token}`).send(body),
    patch: (url: string, body?: object) =>
      http().patch(url).set('Authorization', `Bearer ${token}`).send(body),
    delete: (url: string) => http().delete(url).set('Authorization', `Bearer ${token}`),
  });

  async function member(email: string, role: OrganizationRole) {
    const user = await createUser(app, { email });
    const membershipId = await addMember(app, orgId, user.id, role);
    return { user, membershipId, token: await signIn(app, email) };
  }

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());
  });

  beforeEach(async () => {
    await truncateAll(app);
    orgId = await createOrganization(app, 'northern-trails');
  });
  afterAll(() => app.close());

  /* ── /admin/me/organizations ───────────────────────────────────────── */

  it('lists only the organizations a user belongs to, with role and permissions', async () => {
    const other = await createOrganization(app, 'not-mine');
    const { token } = await member('manager@x.test', Manager);

    const res = await as(token).get('/api/v1/admin/me/organizations');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: orgId,
        role: 'MANAGER',
        timezone: 'Asia/Karachi',
        currencyCode: 'PKR',
        permissions: expect.arrayContaining(['team.manage', 'content.manage']),
      }),
    );
    expect(res.body.data.map((r: { id: number }) => r.id)).not.toContain(other);
  });

  it('gives a super admin every organization with all permissions', async () => {
    await createOrganization(app, 'second');
    await createUser(app, { email: 'root@x.test', isSuperAdmin: true });
    const res = await as(await signIn(app, 'root@x.test')).get(
      '/api/v1/admin/me/organizations',
    );
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual(expect.objectContaining({ role: null }));
    expect(res.body.data[0].permissions).toContain('organization.domains');
  });

  /* ── Team ────────────────────────────────────────────────────────── */

  it('lets an owner add a new member (password required) and attach an existing account', async () => {
    const { token } = await member('owner@x.test', Owner);

    const missingPassword = await as(token).post(
      `/api/v1/admin/organizations/${orgId}/team`,
      {
        email: 'new@x.test',
        name: 'New Person',
        role: Manager,
      },
    );
    expect(missingPassword.status).toBe(422);
    expect(missingPassword.body.code).toBe('PASSWORD_REQUIRED');

    const created = await as(token).post(`/api/v1/admin/organizations/${orgId}/team`, {
      email: 'new@x.test',
      name: 'New Person',
      role: Manager,
      password: TEST_PASSWORD,
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toEqual(
      expect.objectContaining({
        role: 'MANAGER',
        user: expect.objectContaining({ email: 'new@x.test' }),
      }),
    );
    // The new account can sign in straight away.
    await signIn(app, 'new@x.test');

    const duplicate = await as(token).post(
      `/api/v1/admin/organizations/${orgId}/team`,
      {
        email: 'new@x.test',
        name: 'Again',
        role: Member,
      },
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('ALREADY_MEMBER');

    // An account that already exists elsewhere is attached, no password needed.
    await createUser(app, { email: 'works-elsewhere@x.test' });
    const attached = await as(token).post(`/api/v1/admin/organizations/${orgId}/team`, {
      email: 'works-elsewhere@x.test',
      name: 'Ignored',
      role: Member,
    });
    expect(attached.status).toBe(201);
    expect(attached.body.data.user.name).not.toBe('Ignored');
  });

  it('stops admins from creating owners or other admins', async () => {
    const { token } = await member('admin@x.test', Admin);
    for (const role of [Owner, Admin]) {
      const res = await as(token).post(`/api/v1/admin/organizations/${orgId}/team`, {
        email: `${role}@x.test`,
        name: 'X',
        role,
        password: TEST_PASSWORD,
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ROLE_NOT_ASSIGNABLE');
    }
  });

  it('limits a manager to adding and editing members only', async () => {
    const { token } = await member('manager@x.test', Manager);
    const peer = await member('peer@x.test', Manager);

    const ok = await as(token).post(`/api/v1/admin/organizations/${orgId}/team`, {
      email: 'guide@x.test',
      name: 'Guide',
      role: Member,
      password: TEST_PASSWORD,
    });
    expect(ok.status).toBe(201);

    const tooHigh = await as(token).post(`/api/v1/admin/organizations/${orgId}/team`, {
      email: 'boss@x.test',
      name: 'Boss',
      role: Manager,
      password: TEST_PASSWORD,
    });
    expect(tooHigh.status).toBe(403);
    expect(tooHigh.body.code).toBe('ROLE_NOT_ASSIGNABLE');

    const touchPeer = await as(token).patch(
      `/api/v1/admin/organizations/${orgId}/team/${peer.membershipId}`,
      { isActive: false },
    );
    expect(touchPeer.status).toBe(403);
  });

  it('always keeps an owner and never lets people change their own role', async () => {
    const owner = await member('owner@x.test', Owner);

    const demoteSelf = await as(owner.token).patch(
      `/api/v1/admin/organizations/${orgId}/team/${owner.membershipId}`,
      { role: Admin },
    );
    expect(demoteSelf.status).toBe(403);

    const second = await member('owner2@x.test', Owner);
    // With a second owner, the first can be demoted by the second…
    const demoteOther = await as(second.token).patch(
      `/api/v1/admin/organizations/${orgId}/team/${owner.membershipId}`,
      { role: Admin },
    );
    expect(demoteOther.status).toBe(200);

    // …but now the last owner cannot be removed or deactivated by anyone.
    const root = await createUser(app, { email: 'root@x.test', isSuperAdmin: true });
    const rootToken = await signIn(app, root.email);
    const lastOwner = await as(rootToken).patch(
      `/api/v1/admin/organizations/${orgId}/team/${second.membershipId}`,
      { isActive: false },
    );
    expect(lastOwner.status).toBe(409);
    expect(lastOwner.body.code).toBe('LAST_OWNER');
  });

  it('cuts access on the very next request when a membership is deactivated', async () => {
    const owner = await member('owner@x.test', Owner);
    const staff = await member('staff@x.test', Member);

    expect(
      (await as(staff.token).get(`/api/v1/admin/organizations/${orgId}`)).status,
    ).toBe(200);
    await as(owner.token).patch(
      `/api/v1/admin/organizations/${orgId}/team/${staff.membershipId}`,
      {
        isActive: false,
      },
    );
    // Same, still-valid access token.
    expect(
      (await as(staff.token).get(`/api/v1/admin/organizations/${orgId}`)).status,
    ).toBe(403);
  });

  it('removes a member and records it in the organization audit log', async () => {
    const owner = await member('owner@x.test', Owner);
    const staff = await member('staff@x.test', Member);

    const removed = await as(owner.token).delete(
      `/api/v1/admin/organizations/${orgId}/team/${staff.membershipId}`,
    );
    expect(removed.status).toBe(200);

    const audit = await as(owner.token).get(
      `/api/v1/admin/organizations/${orgId}/audit-logs`,
    );
    expect(audit.body.data.items[0]).toEqual(
      expect.objectContaining({ action: 'team.remove', organizationId: orgId }),
    );
    expect(audit.body.data.items[0].metadata?.actingAsSuperAdmin).toBeUndefined();
  });

  it('flags writes a super admin makes inside an organization they are not a member of', async () => {
    const staff = await member('staff@x.test', Member);
    await createUser(app, { email: 'root@x.test', isSuperAdmin: true });
    const root = await signIn(app, 'root@x.test');

    const res = await as(root).patch(
      `/api/v1/admin/organizations/${orgId}/team/${staff.membershipId}`,
      { isActive: false },
    );
    expect(res.status).toBe(200);

    const audit = await as(root).get(`/api/v1/admin/organizations/${orgId}/audit-logs`);
    expect(audit.body.data.items[0]).toEqual(
      expect.objectContaining({
        action: 'team.update',
        metadata: expect.objectContaining({ actingAsSuperAdmin: true }),
      }),
    );
  });

  /* ── Organization dashboard ────────────────────────────────────────── */

  it('shows owners a setup checklist built from real data', async () => {
    const { token } = await member('owner@x.test', Owner);
    const res = await as(token).get(`/api/v1/admin/organizations/${orgId}/dashboard`);
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toEqual({
      teamMembers: 1,
      customers: 0,
      newInquiries: 0,
    });
    const checklist = Object.fromEntries(
      res.body.data.checklist.map((item: { key: string; done: boolean }) => [
        item.key,
        item.done,
      ]),
    );
    expect(checklist).toEqual(
      expect.objectContaining({
        details: false,
        team: false,
        logo: false,
        publish: true,
      }),
    );
  });

  /* ── Platform ────────────────────────────────────────────────────── */

  it('keeps platform routes for super admins only — checked in the database', async () => {
    const { token } = await member('owner@x.test', Owner);
    for (const url of [
      '/api/v1/platform/users',
      '/api/v1/platform/organizations',
      '/api/v1/platform/dashboard',
    ]) {
      expect((await as(token).get(url)).status).toBe(403);
    }

    const root = await createUser(app, { email: 'root@x.test', isSuperAdmin: true });
    await createUser(app, { email: 'root2@x.test', isSuperAdmin: true });
    const rootToken = await signIn(app, 'root@x.test');
    expect((await as(rootToken).get('/api/v1/platform/users')).status).toBe(200);

    // Demoted by another super admin: the old token stops working at once.
    const root2Token = await signIn(app, 'root2@x.test');
    await as(root2Token).patch(`/api/v1/platform/users/${root.id}`, {
      isSuperAdmin: false,
    });
    expect((await as(rootToken).get('/api/v1/platform/users')).status).toBe(403);
  });

  it('onboards an organization with its owner in one step', async () => {
    await createUser(app, { email: 'root@x.test', isSuperAdmin: true });
    const rootToken = await signIn(app, 'root@x.test');

    const created = await as(rootToken).post('/api/v1/platform/organizations', {
      name: 'Silk Route Tours',
      slug: 'silk-route-tours',
      owner: { email: 'sara@silkroute.test', name: 'Sara', password: TEST_PASSWORD },
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toEqual(
      expect.objectContaining({
        slug: 'silk-route-tours',
        status: 'draft',
        websiteEnabled: true,
      }),
    );

    const ownerToken = await signIn(app, 'sara@silkroute.test');
    const mine = await as(ownerToken).get('/api/v1/admin/me/organizations');
    expect(mine.body.data).toEqual([
      expect.objectContaining({ slug: 'silk-route-tours', role: 'OWNER' }),
    ]);

    const taken = await as(rootToken).post('/api/v1/platform/organizations', {
      name: 'Copy',
      slug: 'silk-route-tours',
      owner: { email: 'x@silkroute.test', name: 'X', password: TEST_PASSWORD },
    });
    expect(taken.status).toBe(409);
    expect(taken.body.code).toBe('SLUG_TAKEN');
  });

  it('refuses to leave the platform without an active super admin', async () => {
    const root = await createUser(app, { email: 'root@x.test', isSuperAdmin: true });
    const helper = await createUser(app, {
      email: 'helper@x.test',
      isSuperAdmin: true,
    });
    const token = await signIn(app, 'root@x.test');

    // Demote the helper: fine, root remains.
    expect(
      (
        await as(token).patch(`/api/v1/platform/users/${helper.id}`, {
          isSuperAdmin: false,
        })
      ).status,
    ).toBe(200);
    // Root cannot remove its own access.
    expect(
      (
        await as(token).patch(`/api/v1/platform/users/${root.id}`, {
          isSuperAdmin: false,
        })
      ).status,
    ).toBe(403);
  });

  it('stops members of archived organizations from opening them', async () => {
    const { token } = await member('owner@x.test', Owner);
    await app
      .get(DataSource)
      .query('UPDATE organizations SET status = ? WHERE id = ?', [
        OrganizationStatus.Archived,
        orgId,
      ]);
    expect((await as(token).get(`/api/v1/admin/organizations/${orgId}`)).status).toBe(
      403,
    );
    expect((await as(token).get('/api/v1/admin/me/organizations')).body.data).toEqual(
      [],
    );
  });
});

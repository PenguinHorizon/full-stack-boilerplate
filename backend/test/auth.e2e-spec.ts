import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  createUser,
  refreshCookie,
  TEST_PASSWORD,
  truncateAll,
} from './setup-e2e';

const EMAIL = 'e2e-user@example.com';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let http: () => request.Agent;

  const login = (password = TEST_PASSWORD) =>
    http().post('/api/v1/auth/login').send({ email: EMAIL, password });

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());
  });

  beforeEach(async () => {
    await truncateAll(app);
    await createUser(app, { email: EMAIL, name: 'E2E User' });
  });
  afterAll(() => app.close());

  /* ── Regression tests for the critical findings ─────────────────────── */

  it('has no staff self-registration endpoint', async () => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ name: 'Mallory', email: 'mallory@example.com', password: TEST_PASSWORD });
    expect(res.status).toBe(404);
  });

  it('returns a principal without any role, and never a password', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual(
      expect.objectContaining({ email: EMAIL, isSuperAdmin: false }),
    );
    expect(res.body.data.user).not.toHaveProperty('role');
    expect(JSON.stringify(res.body)).not.toMatch(/"password"/);
  });

  it('records the last sign-in time', async () => {
    await login();
    const token = (await login()).body.data.accessToken;
    const me = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    const [row] = await app
      .get(DataSource)
      .query('SELECT last_login_at FROM users WHERE email = ?', [EMAIL]);
    expect(Math.abs(new Date(row.last_login_at).getTime() - Date.now())).toBeLessThan(
      60_000,
    );
  });

  it('does NOT return the reset token from forgot-password', async () => {
    const res = await http()
      .post('/api/v1/auth/forgot-password')
      .send({ email: EMAIL });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      message: 'If that email is registered, a reset link has been sent.',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/resetToken|token/i);
  });

  it('gives an identical forgot-password response for an unknown address', async () => {
    const res = await http()
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody-at-all@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/If that email is registered/);
  });

  it('returns 401 (not 500) for bad credentials', async () => {
    expect((await login('WrongPassword1')).status).toBe(401);
  });

  it('rejects a deactivated account', async () => {
    await createUser(app, { email: 'off@example.com', isActive: false });
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'off@example.com', password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rejects a new password that fails the strength policy with field errors', async () => {
    const token = (await login()).body.data.accessToken;
    const res = await http()
      .put('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'newPassword' })]),
    );
  });

  /* ── Profile ────────────────────────────────────────────────────────── */

  it('updates the caller’s own profile and rejects unknown fields', async () => {
    const token = (await login()).body.data.accessToken;
    const updated = await http()
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed', phone: '+923001234567' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toEqual(
      expect.objectContaining({ name: 'Renamed', phone: '+923001234567' }),
    );

    // whitelist + forbidNonWhitelisted: privilege fields are a 400, not ignored.
    const escalation = await http()
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ isSuperAdmin: true });
    expect(escalation.status).toBe(400);
  });

  /* ── Session lifecycle ──────────────────────────────────────────────── */

  it('runs the full sign-in → access → refresh → logout cycle', async () => {
    const signedIn = await login();
    const cookie = refreshCookie(signedIn.headers)!;
    const accessToken = signedIn.body.data.accessToken;

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');

    const me = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(EMAIL);

    const refreshed = await http().post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeDefined();

    const rotated = refreshCookie(refreshed.headers)!;
    expect(rotated).not.toBe(cookie);

    expect(
      (await http().post('/api/v1/auth/logout').set('Cookie', rotated)).status,
    ).toBe(200);
    expect(
      (await http().post('/api/v1/auth/refresh').set('Cookie', rotated)).status,
    ).toBe(401);
  });

  it('revokes the whole family when a rotated token is replayed', async () => {
    const original = refreshCookie((await login()).headers)!;

    const refreshed = await http().post('/api/v1/auth/refresh').set('Cookie', original);
    const rotated = refreshCookie(refreshed.headers)!;

    // Replaying the superseded token is treated as theft…
    expect(
      (await http().post('/api/v1/auth/refresh').set('Cookie', original)).status,
    ).toBe(401);
    // …and it takes the legitimate successor down with it.
    expect(
      (await http().post('/api/v1/auth/refresh').set('Cookie', rotated)).status,
    ).toBe(401);
  });

  it('rejects a refresh token presented as a bearer credential', async () => {
    const raw = refreshCookie((await login()).headers)!
      .split(';')[0]
      .replace('refresh_token=', '');
    const res = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${raw}`);
    expect(res.status).toBe(401);
  });

  it('requires authentication on /auth/me', async () => {
    expect((await http().get('/api/v1/auth/me')).status).toBe(401);
  });

  it('no longer exposes the account-enumeration endpoint', async () => {
    const res = await http().post('/api/v1/auth/check-email').send({ email: EMAIL });
    expect(res.status).toBe(404);
  });
});

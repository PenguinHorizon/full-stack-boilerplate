import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, truncateAll } from './setup-e2e';

/**
 * The other e2e specs run with throttling skipped so their auth traffic isn't
 * mistaken for an attack. This one keeps it on, so the guard that protects
 * /auth/login stays covered rather than being disabled everywhere at once.
 */
describe('Rate limiting (e2e)', () => {
  let app: INestApplication;
  let http: () => request.Agent;

  beforeAll(async () => {
    app = await createTestApp({ throttle: true });
    http = () => request(app.getHttpServer());
  });

  beforeEach(() => truncateAll(app));
  afterAll(() => app.close());

  it('throttles repeated login attempts on the auth routes', async () => {
    const attempt = () =>
      http()
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'WrongPassword123' });

    const statuses: number[] = [];
    // The auth routes allow 5/minute; the 6th must be rejected by the guard.
    for (let i = 0; i < 8; i += 1) {
      statuses.push((await attempt()).status);
    }

    expect(statuses).toContain(429);
    // Everything before the limit is a normal auth failure, not a server error.
    expect(statuses.slice(0, 5).every((status) => status === 401)).toBe(true);
  });

  it('does not throttle unauthenticated health checks', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      statuses.push((await http().get('/api/health/live')).status);
    }

    expect(statuses.every((status) => status === 200)).toBe(true);
  });
});

/*
 * Behind a reverse proxy every request arrives from the proxy. Without
 * TRUST_PROXY all clients would share one bucket; with it set too loosely,
 * a client could send its own X-Forwarded-For to dodge the limit.
 */
const loginFrom = (http: () => request.Agent, ip: string) =>
  http()
    .post('/api/v1/auth/login')
    .set('X-Forwarded-For', ip)
    .send({ email: 'nobody@example.com', password: 'WrongPassword123' });

describe('Rate limiting without a trusted proxy (e2e)', () => {
  let app: INestApplication;
  let http: () => request.Agent;

  beforeAll(async () => {
    delete process.env.TRUST_PROXY;
    app = await createTestApp({ throttle: true });
    http = () => request(app.getHttpServer());
  });
  afterAll(() => app.close());

  it('ignores a forged X-Forwarded-For: changing it does not reset the limit', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await loginFrom(http, `198.51.100.${i + 1}`)).status);
    }
    expect(statuses.slice(0, 5).every((status) => status === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe('Rate limiting behind a trusted proxy (e2e)', () => {
  let app: INestApplication;
  let http: () => request.Agent;

  beforeAll(async () => {
    // The test client connects over loopback, like nginx in front of the API.
    process.env.TRUST_PROXY = 'loopback';
    app = await createTestApp({ throttle: true });
    http = () => request(app.getHttpServer());
  });
  afterAll(async () => {
    delete process.env.TRUST_PROXY;
    await app.close();
  });

  it('gives each client its own limit', async () => {
    const first: number[] = [];
    for (let i = 0; i < 6; i += 1)
      first.push((await loginFrom(http, '203.0.113.10')).status);
    expect(first[5]).toBe(429);

    // Another visitor behind the same proxy is unaffected.
    expect((await loginFrom(http, '203.0.113.20')).status).toBe(401);
  });
});

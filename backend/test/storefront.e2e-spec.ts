import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { OrganizationRole } from '../src/common/constants/tenancy.enums';
import { ContentStatus, PageKey, SectionKey } from '../src/common/constants/website';
import {
  Faq,
  SitePage,
  Testimonial,
  WebsiteSection,
} from '../src/database/entities/website/content.entity';
import { Inquiry } from '../src/database/entities/website/inquiry.entity';
import {
  addMember,
  createOrganization,
  createTestApp,
  createUser,
  signIn,
  truncateAll,
} from './setup-e2e';
import { checkConsistency } from '../src/database/consistency';

/**
 * The public-website API: home, content, contact form and SEO files — all
 * built from real data.
 */
describe('Storefront (e2e)', () => {
  let app: INestApplication;
  let http: () => request.Agent;
  let ds: DataSource;
  let orgId: number;
  let owner: string;
  const pub = (path = '') => `/api/v1/public/organizations/northern-trails${path}`;
  const admin = (path: string) => `/api/v1/admin/organizations/${orgId}${path}`;

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());
    ds = app.get(DataSource);
  });

  beforeEach(async () => {
    await truncateAll(app);
    orgId = await createOrganization(app, 'northern-trails');
    await ds.query(
      "UPDATE organizations SET timezone = 'Asia/Karachi', country_code = 'PK', contact_email = 'hello@trails.test', description = 'Mountains and valleys.' WHERE id = ?",
      [orgId],
    );
    await ds.query(
      'UPDATE organization_settings SET website_enabled = 1 WHERE organization_id = ?',
      [orgId],
    );
    const user = await createUser(app, { email: 'owner@x.test' });
    await addMember(app, orgId, user.id, OrganizationRole.Owner);
    owner = await signIn(app, 'owner@x.test');
  });
  // Every flow must leave the cross-table rules intact (src/database/consistency.ts).
  afterEach(async () => {
    const { issues } = await checkConsistency((sql, params) => ds.query(sql, params));
    expect(issues).toEqual([]);
  });
  afterAll(() => app.close());

  describe('home and content', () => {
    it('builds every section in the default order when none are configured, skipping empty ones', async () => {
      const sections = (await http().get(pub('/home'))).body.data.sections;
      expect(sections.map((s: { key: string }) => s.key)).toEqual([
        'hero',
        'intro',
        'contact',
      ]);
      expect(sections.find((s: { key: string }) => s.key === 'intro').body).toBe(
        'Mountains and valleys.',
      );
    });

    it('follows configured order, titles and switches, and only shows published content', async () => {
      await ds.getRepository(WebsiteSection).save([
        {
          organizationId: orgId,
          sectionKey: SectionKey.Testimonials,
          sortOrder: 0,
          title: 'Kind words',
        },
        { organizationId: orgId, sectionKey: SectionKey.Hero, sortOrder: 1 },
        {
          organizationId: orgId,
          sectionKey: SectionKey.Intro,
          sortOrder: 2,
          isEnabled: false,
        },
      ]);
      await ds.getRepository(Testimonial).save([
        {
          organizationId: orgId,
          authorName: 'Hira',
          quote: 'Great.',
          status: ContentStatus.Published,
        },
        {
          organizationId: orgId,
          authorName: 'Draft',
          quote: 'Not yet.',
          status: ContentStatus.Draft,
        },
      ]);
      const sections = (await http().get(pub('/home'))).body.data.sections;
      expect(
        sections.map((s: { key: string; title: string | null }) => [s.key, s.title]),
      ).toEqual([
        ['testimonials', 'Kind words'],
        ['hero', null],
      ]);
      expect(
        sections[0].testimonials.map((t: { authorName: string }) => t.authorName),
      ).toEqual(['Hira']);
    });

    it('serves published pages and FAQs, and lists them in the navigation', async () => {
      await ds.getRepository(SitePage).save([
        {
          organizationId: orgId,
          pageKey: PageKey.About,
          title: 'Our story',
          body: 'We travel.',
          status: ContentStatus.Published,
        },
        {
          organizationId: orgId,
          pageKey: PageKey.Terms,
          title: 'Terms',
          body: 'Draft.',
          status: ContentStatus.Draft,
        },
      ]);
      await ds.getRepository(Faq).save([
        {
          organizationId: orgId,
          category: 'Booking',
          question: 'Refunds?',
          answer: 'Yes.',
          status: ContentStatus.Published,
        },
        {
          organizationId: orgId,
          category: 'Booking',
          question: 'Hidden?',
          answer: 'No.',
          status: ContentStatus.Draft,
        },
      ]);

      const about = await http().get(pub('/pages/about'));
      expect(about.body.data).toEqual(
        expect.objectContaining({ key: 'about', title: 'Our story' }),
      );
      expect((await http().get(pub('/pages/terms'))).status).toBe(404);
      expect((await http().get(pub('/pages/secret'))).status).toBe(400);
      expect((await http().get(pub('/faqs'))).body.data).toEqual([
        {
          category: 'Booking',
          items: [expect.objectContaining({ question: 'Refunds?' })],
        },
      ]);

      const nav = (await http().get(pub())).body.data.navigation;
      expect(nav.pages).toEqual(['about', 'faqs']);
    });
  });

  /* ── Contact form ────────────────────────────────────────────────── */

  describe('contact form', () => {
    const send = (body: object) => http().post(pub('/inquiries')).send(body);

    it('stores a message with a normalised phone and notifies the team', async () => {
      const res = await send({
        name: 'Ayesha',
        phone: '0300 1234567',
        message: 'Do you run family trips in spring?',
      });
      expect(res.status).toBe(201);
      const [stored] = await ds.getRepository(Inquiry).find();
      expect(stored).toEqual(
        expect.objectContaining({
          organizationId: orgId,
          phone: '+923001234567',
          status: 'new',
        }),
      );

      // The bell: the owner (inquiry.view) gets an in-app notification.
      const bell = await http()
        .get(admin('/notifications'))
        .set('Authorization', `Bearer ${owner}`);
      expect(bell.body.data.unreadCount).toBe(1);
      expect(bell.body.data.items[0]).toEqual(
        expect.objectContaining({
          type: 'inquiry.received',
          data: { inquiryId: stored.id },
        }),
      );
    });

    it('explains what is missing, field by field', async () => {
      const short = await send({ name: 'A', message: 'Hi' });
      expect(short.status).toBe(400);
      expect(short.body.errors.map((e: { field: string }) => e.field)).toEqual([
        'message',
      ]);

      const noContact = await send({ name: 'A', message: 'Long enough message here.' });
      expect(noContact.status).toBe(400);
      expect(noContact.body.errors[0].field).toBe('email');
    });

    it('quietly drops messages that fill in the honeypot', async () => {
      const res = await send({
        name: 'Bot',
        email: 'bot@x.test',
        message: 'Buy cheap things now!!!',
        website: 'https://spam.example',
      });
      expect(res.status).toBe(201);
      expect(await ds.getRepository(Inquiry).count()).toBe(0);
    });
  });

  /* ── SEO and availability ────────────────────────────────────────── */

  it('serves per-host robots.txt and sitemap.xml, unwrapped', async () => {
    await ds.getRepository(SitePage).save({
      organizationId: orgId,
      pageKey: PageKey.About,
      title: 'About',
      body: 'Hello.',
      status: ContentStatus.Published,
    });
    const robots = await http().get(
      '/api/v1/public/seo/robots.txt?host=northern-trails.localhost:5173',
    );
    expect(robots.status).toBe(200);
    expect(robots.headers['content-type']).toMatch(/text\/plain/);
    expect(robots.text).toContain('Disallow: /admin');
    expect(robots.text).toContain(
      'Sitemap: http://northern-trails.localhost:5173/sitemap.xml',
    );

    const sitemap = await http().get(
      '/api/v1/public/seo/sitemap.xml?host=northern-trails.localhost:5173',
    );
    expect(sitemap.headers['content-type']).toMatch(/application\/xml/);
    expect(sitemap.text).toContain(
      '<loc>http://northern-trails.localhost:5173/about</loc>',
    );
    expect(sitemap.text).toContain(
      '<loc>http://northern-trails.localhost:5173/contact</loc>',
    );

    const unknown = await http().get(
      '/api/v1/public/seo/robots.txt?host=nobody.example.com',
    );
    expect(unknown.text).toBe('User-agent: *\nDisallow: /\n');
  });

  it('treats an organization that is not live as unknown on every storefront endpoint', async () => {
    await ds.query(
      'UPDATE organization_settings SET website_enabled = 0 WHERE organization_id = ?',
      [orgId],
    );
    for (const path of ['', '/home', '/faqs', '/gallery', '/pages/about']) {
      const res = await http().get(pub(path));
      expect({ path, status: res.status, code: res.body.code }).toEqual({
        path,
        status: 404,
        code: 'ORGANIZATION_UNAVAILABLE',
      });
    }
    const inquiry = await http()
      .post(pub('/inquiries'))
      .send({ name: 'A', email: 'a@x.test', message: 'Long enough message here.' });
    expect(inquiry.status).toBe(404);
  });
});

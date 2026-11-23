# Architecture Decision Log

Each decision records the context, the choice, and what it costs us. These
are the platform-level decisions this boilerplate is built on; add your own
below as the product grows (next free number: ADR-029). Decisions that only
applied to the original organization domain were removed.

| #       | Decision                                                            | Status   | Date       |
| ------- | ------------------------------------------------------------------- | -------- | ---------- |
| ADR-001 | Build on the existing boilerplate instead of re-initialising        | Accepted | 2026-11-12 |
| ADR-002 | Shared-database multi-tenancy keyed by `organization_id`              | Accepted | 2026-11-12 |
| ADR-003 | Every organization gets its own branded public website                | Accepted | 2026-11-12 |
| ADR-004 | One Vite + React + TypeScript frontend with separate apps inside    | Accepted | 2026-11-12 |
| ADR-005 | Staff and customer identities are separate; customers are per-brand | Accepted | 2026-11-12 |
| ADR-006 | Roles/permissions defined in code; memberships stored in the DB     | Accepted | 2026-11-12 |
| ADR-009 | `/api/v1` with route groups per audience                            | Accepted | 2026-11-12 |
| ADR-010 | Tenant consistency of references enforced in services, not composite FKs | Accepted | 2026-11-12 |
| ADR-011 | Money: DECIMAL in DB, integer minor units in code, decimal strings in JSON | Accepted | 2026-11-12 |
| ADR-012 | Media referenced by ID with RESTRICT FKs; hard delete only when unused | Accepted | 2026-11-12 |
| ADR-013 | Admin routes and URLs use the numeric organization ID                | Accepted | 2026-11-12 |
| ADR-014 | Accessible headless primitives (Radix) and a short list of new dependencies | Accepted | 2026-11-12 |
| ADR-015 | Every MySQL session runs in UTC (driver-level), whatever the server zone | Accepted | 2026-11-12 |
| ADR-016 | Entities are the schema source; one reviewed migration per change; drift checked in CI | Accepted | 2026-11-24 |
| ADR-017 | Per-organization access comes from one endpoint, not the session      | Accepted | 2026-11-12 |
| ADR-020 | Website page bodies use a small, safe text format, never HTML       | Accepted | 2026-11-13 |
| ADR-023 | Customer sessions: own token audience, path-scoped cookie | Accepted | 2026-11-14 |
| ADR-025 | Draft preview uses the staff session on the platform host, never a public link | Accepted | 2026-11-14 |
| ADR-026 | TLS at a Caddy edge: certificates on demand, only for hosts the API vouches for | Accepted | 2026-11-17 |
| ADR-027 | Uploaded images are re-encoded on upload: upright, at most 2000 px, no metadata | Accepted | 2026-11-17 |
| ADR-028 | The client address comes from `X-Forwarded-For` only through named trusted hops | Accepted | 2026-11-17 |

---

## ADR-001 — Build on the existing boilerplate

**Context.** The repository already contained a working NestJS 11 + React 19
boilerplate with rotating refresh tokens, global guards, a response envelope,
an exception filter, migrations, a seeder, upload validation, mail, audit
logging and CI. Baseline commit: `9b3f5dd`.

**Decision.** Keep the backend foundation and evolve it. Rework the frontend
(TypeScript conversion, new structure, new design systems) rather than
starting a fresh Vite project.

**Consequences.** New products start from a working foundation rather than
an empty repository; domain features are added as modules on top of it.

---

## ADR-002 — Shared-database multi-tenancy keyed by `organization_id`

**Context.** The platform must host many organizations without a redesign
later. Options: database-per-tenant, schema-per-tenant, or
one shared schema with a tenant column.

**Decision.** One MySQL schema. Every tenant-owned table carries a non-null
`organization_id`. Tenant scope is
enforced in the API layer: a guard resolves the caller's memberships, and
services only query through tenant-scoped helpers. A request never trusts a
client-supplied organization ID without checking membership.

**Consequences.**

- Cheapest to operate and migrate; one migration set for all tenants.
- Isolation depends on code discipline, so the QA suite runs automated
  cross-tenant access tests for every admin endpoint.
- Composite indexes start with `organization_id` on hot tables.
- Slugs and codes are unique per organization, not globally (except the
  organization slug itself).

---

## ADR-003 — Every organization gets its own branded public website

**Context.** Each organization needs its own public site under its own
brand, not a page inside a marketplace.

**Decision.**

1. The public storefront renders exactly one organization at a time, with that
   organization's logo, colours and content.
2. The organization is resolved at startup, in this order:
   - **Host:** a custom domain or platform subdomain (`{slug}.{PLATFORM_DOMAIN}`)
     mapped in a `organization_domains` table.
   - **Path fallback:** `/s/{slug}/…` on the platform host. This works with
     no DNS setup, on a single server, and in local development.
3. The platform root (no tenant matched) shows a simple **organization
   directory**, so customers can still "explore organizations".
4. The API is served **same-origin at `/api` on every host** through the
   reverse proxy, so customer session cookies stay first-party on custom
   domains.

**Consequences.**

- One resolver plus a dynamic React Router `basename` means pages are written
  once and work under both schemes.
- Local development uses `{slug}.localhost:5173` (modern browsers resolve
  `*.localhost` to loopback) or `/s/{slug}`.
- Custom-domain TLS is handled at the edge (ADR-026).
- An SPA limits SEO for crawlers that don't run JavaScript. We use React 19's
  native `<title>`/`<meta>` support now, plus per-host `sitemap.xml` and
  `robots.txt` from the API. Prerendering/SSR is a later enhancement.

---

## ADR-004 — One Vite + React + TypeScript frontend with separate apps inside

**Context.** The prompt asks for two interconnected applications and suggests
`frontend/public-website` + `frontend/admin-portal`. The current frontend is
one JavaScript (JSX) app.

**Decision.** Convert to strict TypeScript. Keep a single Vite project
containing three apps that share a core:

```
frontend/src/
  apps/storefront/   per-organization public website (brand-themed)
  apps/admin/        organization admin portal (its own SaaS design system)
  apps/platform/     platform root: organization directory
  shared/            api client, types, auth, utilities, UI primitives
```

Each app has its own layout, design tokens and route tree, and is lazy-loaded,
so customers never download admin code.

**Consequences.** One toolchain, one lockfile, one build, shared types with no
publishing step. Splitting into two deployable apps later is a mechanical
change because the boundaries already exist.

---

## ADR-005 — Staff and customer identities are separate; customers are per-brand

**Context.** Staff (owners, managers) and customers (people using an
organization's public website) have different lifecycles, permissions and
privacy expectations. Each organization owns its customer relationship.

**Decision.**

- Staff live in `users` with organization memberships.
- Customers live in `customers`, scoped by `organization_id`. A person who
  uses two organizations' sites has two customer records.
- Separate token audiences (`admin` vs `storefront`), so a customer token can
  never reach an admin route.
- Accounts are optional; domain features (e.g. bookings) decide what an
  account adds.

**Consequences.** No cross-brand single sign-on for customers (acceptable;
brands are independent). Customer authentication reuses the refresh-token
machinery with a separate cookie path.

---

## ADR-006 — Roles/permissions in code; memberships in the database

**Context.** The prompt suggests `Role`, `Permission` and `UserRole` tables.
The boilerplate defines the role→permission matrix in code
(`roles.config.ts`), shared with the frontend so the two cannot drift.

**Decision.**

- The four roles (Owner, Admin, Manager, Member) and their permission sets
  stay in code: versioned, reviewable and unit-tested.
- The database stores **who has which role where**: `organization_users`
  (user, organization, role).
- `SUPER_ADMIN` is a platform-level flag on the user, not a membership.

**Consequences.** No per-organization custom roles in the MVP; this is a listed
future enhancement that would add DB-backed role definitions. It is a
deliberate deviation from the prompt's suggested entity list.

---

## ADR-009 — `/api/v1` with route groups per audience

**Decision.** Use NestJS URI versioning (`/api/v1/...`) and group routes by
who calls them:

| Prefix                                  | Audience                    | Auth                             |
| --------------------------------------- | --------------------------- | -------------------------------- |
| `/api/v1/public/...`                    | Storefront, anonymous       | none; published data only        |
| `/api/v1/storefront/...`                | Signed-in customers         | customer token                   |
| `/api/v1/admin/organizations/:orgId/...`    | Organization staff            | staff token + membership of :orgId |
| `/api/v1/platform/...`                  | Platform operators          | `SUPER_ADMIN`                    |
| `/api/v1/auth/...`, `/api/v1/health/..` | Shared                      | as today                         |

Putting `:orgId` in the admin path makes tenant scope explicit, auditable and
visible in Swagger, rather than hidden in a header.

---

## ADR-010 — Tenant consistency enforced in services, not composite FKs

**Context.** Composite foreign keys such as `(organization_id, category_id) →
categories(organization_id, id)` would make cross-tenant references impossible
at the database level. TypeORM cannot map one column (`organization_id`) shared
by several composite relations cleanly, and its schema diff would keep trying
to drop hand-written composite FKs.

**Decision.**

- Single-column FKs in the database.
- Every ID referenced in a request (media, and the records your features
  add) is loaded through the tenant-scoped helpers
  (`common/tenancy/tenant-helpers.ts`). A miss returns
  `422 INVALID_REFERENCE`.
- The QA suite's isolation sweep covers it (`backend/test/qa.e2e-spec.ts`).

**Consequences.** One rule for reviewers to check ("no unscoped lookups").
Database-level protection could be added later with triggers if needed.

---

## ADR-011 — Money representation

**Decision.**

- Store `DECIMAL(12,2)`.
- Compute in **integer minor units** in `common/domain/money.ts`, rounding
  half-up per line.
- Send **decimal strings** (`"1150.00"`) over JSON; the currency comes from
  the organization.
- The frontend formats with `Intl.NumberFormat` and never computes
  authoritative totals: the server quotes them.

**Consequences.** No floating-point drift between what is shown and what is
charged. One formatting helper per side.

---

## ADR-012 — Media referenced by ID, protected by RESTRICT FKs

**Context.** The boilerplate stores uploads as loose files and image URLs as
strings, with no ownership. The platform needs a per-organization media library
where images are reused and deleted only when unused.

**Decision.**

- `media_assets` rows are owned by an organization.
- Every image column is a `*_media_id` FK with `ON DELETE RESTRICT`.
- Deleting a used asset fails in the database and maps to
  `409 MEDIA_IN_USE`.
- Files live under `uploads/r/{organizationId}/` (or Cloudinary with the same
  prefix).

**Consequences.** Public payloads join media to return URLs, which is cheap
because they are indexed PK lookups. "Delete when unused" needs no
reference-counting code.

---

## ADR-013 — Admin routes use the numeric organization ID

**Decision.** API paths `/api/v1/admin/organizations/:orgId/...` and admin UI
URLs `/admin/:orgId/...` use the numeric ID, not the slug.

**Consequences.** Renaming an organization's slug never breaks staff bookmarks
or API clients.

---

## ADR-014 — Accessible headless primitives and new dependencies

**Context.** The prompt asks to avoid unnecessary dependencies and also
requires accessible modals, drawers, selects, dropdowns and tabs. Hand-rolled
versions are a common source of focus-trap and keyboard bugs.

**Decision.** Add only:

- Radix UI primitives (unstyled);
- `@dnd-kit` for accessible reordering;
- self-hosted variable fonts;
- `react-markdown` for safe CMS rendering;
- `libphonenumber-js` (frontend and backend);
- Playwright in Phase 10.

No chart, date, state-machine, CSS-in-JS or real-time libraries. The full
justification table is in [phase-2/01-architecture.md §7](phase-2/01-architecture.md).

---

## ADR-015 — Every MySQL session runs in UTC

**Context.** Found during visual verification: the admin dashboard
showed sign-ins "in 5 hours".

- The boilerplate set `timezone: 'Z'`, which only tells mysql2 how to *parse*
  dates.
- The MySQL session still ran in the server's zone (here SYSTEM = PKT,
  UTC+5).
- As a result, `CURRENT_TIMESTAMP` defaults and TIMESTAMP→text conversion
  produced local wall-clock values that were then read as UTC.

Every stored time would have been wrong by the server's offset, including
every scheduled window and date-based check.

**Decision.**

- TypeORM gets a wrapped mysql2 driver (`database/utc-mysql-driver.ts`) whose
  pool runs `SET time_zone = '+00:00'` on every new connection, before the
  connection serves any query.
- This applies to the API, migrations, seeds and CLI tools alike, because they
  share `database/options.ts`.

**Consequences.**

- Correct regardless of hosting provider or server configuration; no reliance
  on `default-time-zone` in `my.cnf`.
- An e2e regression test (`test/time-zone.e2e-spec.ts`) checks the session zone
  on concurrent connections and round-trips TIMESTAMP and DATETIME defaults.
- Rows written before the fix keep their shifted values. Local databases are
  reset with `npm run db:reset`; there was no production data.

---

## ADR-016 — Entities are the schema source; one reviewed migration per change; drift checked in CI

**Context.** `db:verify` compares entity metadata with the live schema.
TypeORM compares column comments but ignores MySQL CHECK constraints. The
boilerplate was reset to a single `InitSchema` baseline generated from the
entities when the restaurant domain was removed.

**Decision.**

- Entities name every FK and index explicitly (`foreignKeyConstraintName`,
  named `@Index`), so generated SQL is stable and reviewable.
- A schema change is an entity change plus a migration generated with
  `npm run migration:generate -- src/database/migrations/<Name>`, reviewed by
  hand (add CHECK constraints and online-DDL hints there when needed).
- CI runs `npm run db:verify` after migrations and fails on any drift.
- `npm run db:drift` prints the differing SQL locally.

**Consequences.** No separate `schema.sql` to keep in sync; the migration
history is the schema's changelog.

## ADR-017 — Per-organization access comes from one endpoint, not the session

**Context.** An earlier plan returned `memberships[]` (role and permissions
per organization) from `/auth/login` and `/auth/me`. In practice,
memberships turned out to change independently of the session. An owner adds
someone or changes their role, a super admin onboards an organization, a
organization is archived. The API already re-reads the membership on every
request (TenantGuard), so a copy held in the session would only go stale.

**Decision.**

- The access token carries identity and the `sa` (super admin) flag only. No
  roles or permissions.
- `GET /admin/me/organizations` is the single source for what the user can open
  and do in each organization. `/auth/login` and `/auth/me` return the principal
  only.
- The admin loads that list before rendering any screen, refreshes it on
  window focus, and invalidates it after changes that affect it.
- The frontend repeats the permission *names* and team rules only to shape the
  UI. A unit test compares the names with the backend matrix.

**Consequences.** Role changes reach an open admin tab without signing in
again; the API stays authoritative either way. Signing in costs one extra
request. The planned `memberships[]` fields are not part of the auth
responses.

## ADR-020 — Website page bodies use a small, safe text format, never HTML

**Context.** About, Privacy and Terms (`pages.body`) are written by organization
staff and shown on a public site. Storing HTML would need a sanitiser on the
server, a rich-text editor in the admin, and constant care about scripts and
styles leaking into a branded page. A full Markdown library adds weight and
features nobody asked for (tables, raw HTML, images).

**Decision.**

- Bodies are plain text with a few conventions: `## Heading`, `### Subheading`,
  paragraphs separated by a blank line, `- ` bullet lists, `**bold**`, and
  `[links](https://…)`. Only `https:`, `mailto:` and `tel:` links become links;
  anything else stays text.
- The storefront parses it into blocks and renders React elements
  (`apps/storefront/lib/rich-text.ts`); nothing is ever set as HTML.
- The admin page editor uses the same format, with a preview.

**Consequences.** No HTML injection path exists for page content. Formatting
is limited on purpose; anything richer (images, embeds) goes into dedicated
sections. Meta descriptions come from the first paragraph.

## ADR-023 — Customer sessions: own token audience, path-scoped cookie

**Context.** Customers sign in per organization (ADR-005). Their tokens must
never open staff routes, and a staff token must never act as a customer.
Phones are the identity, so registering someone else's number must not
reveal anything that person did as a guest.

**Decision.**

- Customer access tokens use the same HS256 secret and issuer as staff tokens
  but their own audience (`CUSTOMER_JWT_AUDIENCE`, default `app-storefront`)
  and carry the organization id; the staff guard pins the staff audience, the
  customer guard pins the customer audience and the organization in the path.
- Refresh tokens rotate with reuse detection, exactly like staff sessions,
  in `customer_refresh_tokens`. The `customer_refresh_token` cookie is
  httpOnly and path-scoped to `/api/v1/storefront/{slug}/auth`, so it is sent
  only to that organization's refresh and sign-out. Refresh lasts
  `CUSTOMER_REFRESH_EXPIRES_IN` (30 days).
- The storefront keeps the access token in memory. It tries to restore a
  session on load only when this browser signed in before (a local flag), so
  guests never make a request bound to fail.
- Customers are unique per organization by phone. Registering a phone that
  exists as a guest record claims it; until phones are verified (OTP is a
  future addition), any history a feature shows should start at
  `registered_at`.

**Consequences.** One signing secret serves both audiences; separating them is
an audience check, tested in e2e.

## ADR-025 — Draft preview uses the staff session on the platform host, never a public link

**Context.** Staff want to see draft website content (pages, FAQs,
banners, gallery, reviews, the navigation) in place before publishing. Public
content is cacheable, and drafts must never leak into a cache or to visitors.

**Decision.**

- The public bootstrap, home, page, FAQ and gallery endpoints accept
  `?preview=1`. Drafts are added only when the request also carries a valid
  staff access token for a member with `content.view` in that organization; any
  other request gets the published content (never an error, so the flag
  reveals nothing). Responses to `preview` requests are `private, no-store`.
- The storefront turns preview on from `?preview=1` and keeps it for the tab
  (session storage) so links inside the site stay in preview, shows a preview
  bar with "Exit preview", and gets the staff token from the existing staff
  refresh cookie. That cookie is scoped to `/api/v1/auth` on the platform
  host, so preview works at `{platform}/s/{slug}`; the admin's preview links
  point there.
- There are no shareable preview links or preview tokens.

**Consequences.** Preview isn't available on an organization's own domain (the
staff cookie isn't there); the bar then asks the user to sign in. Refreshing the
staff session from the storefront rotates the shared refresh cookie, which the
admin tab then uses as normal.

## ADR-026 — TLS at a Caddy edge: certificates on demand, only for hosts the API vouches for

**Context.** Every organization has a storefront at `{slug}.{platform}`, and
organizations may bring their own domain (ADR-003). Each of those hosts needs a
certificate. Organizations are created at any time by platform admins, so a
fixed certificate list would need an operator for every new organization, and an
open "issue for any host" setup lets anyone point a domain at the server and
burn the certificate authority's rate limits.

**Decision.**

- A Caddy container (`edge`, `deploy/docker-compose.prod.yml`) is the only
  public entry: ports 80 and 443. It terminates TLS, adds HSTS (one year, no
  `includeSubDomains`: an organization's own domain may have subdomains that are
  not ours) and proxies to the `web` container (nginx), which serves the SPA
  and forwards `/api` and `/uploads` to the API.
- Certificates are issued on the first visit to a host ("on-demand TLS"), but
  only after Caddy asks `GET /api/v1/public/sites/tls-check?domain=` and gets
  `200`: the platform domain, the subdomain of an existing organization, or a
  custom domain with `verified_at` set. Anything else gets no certificate.
- Operators who expect many subdomains can switch the platform domain to one
  wildcard certificate via the DNS challenge (documented in
  [deployment.md](deployment.md#wildcard-certificate)); custom domains stay
  on demand.

**Consequences.** New organizations work over HTTPS with no operator step; the
first visit to a new host waits a few seconds for issuance. The `caddy_data`
volume holds the certificates and keys and must be kept (and backed up), or
every restart re-issues and can hit rate limits. The check endpoint is public
and answers only yes/no about hosts that are public anyway.

## ADR-027 — Uploaded images are re-encoded on upload: upright, at most 2000 px, no metadata

**Context.** Organizations upload photos straight from phones: 4000+ px, several
MB, often sideways (EXIF orientation) and carrying EXIF including GPS. They
were stored and served as uploaded, so a storefront hero could cost
megabytes per image, and the files leaked metadata. Upload validation only read
headers, so a file with a valid header and garbage after it was accepted.

**Decision.**

- After the byte sniffer and size limits, uploads go through `sharp`
  (`backend/src/modules/media/image-optimiser.ts`): turned upright, fitted
  inside 2000 × 2000 (never enlarged), re-encoded **in the same format**
  (JPEG q82 mozjpeg, PNG lossless level 9, WebP q82, AVIF q55), metadata not
  copied. GIFs and animated WebP/AVIF are stored as uploaded (re-encoding
  keeps one frame). A re-encode that would be larger is discarded unless it
  was needed (resize, metadata or orientation).
- A file that does not decode is refused with `415 UNSUPPORTED_MEDIA`.
- The recorded width, height and size are those of the stored file.
- `/uploads/*` is served with `Cache-Control: public, max-age=31536000,
  immutable`: files are written once under a fresh UUID and an image in use
  can't be deleted.

**Consequences.** A 4032 × 3024 phone photo is stored at 2000 × 1500: a
quarter of the pixels to download and decode, before the re-encode. URLs, MIME types and transparency don't change,
so nothing else in the system had to. `sharp` is a native dependency: the
lockfile carries the Alpine (musl) binaries and CI runs it inside the API
image. Images uploaded before this change stay as they were. One size serves
every placement; responsive variants (`srcset`) are future work.

## ADR-028 — The client address comes from `X-Forwarded-For` only through named trusted hops

**Context.** Rate limits (login, contact form) and audit logs key on
the client's IP. Behind nginx (and Caddy in production) every request reaches
the API from a private Docker address, so all visitors shared one rate-limit
bucket, while trusting `X-Forwarded-For` from anyone lets a client choose its
own address.

**Decision.** Express's `trust proxy` comes from `TRUST_PROXY`, validated at
boot: `false`, a hop count, or subnet names/CIDRs. `true` is refused. The
Docker setup trusts `loopback, linklocal, uniquelocal` (the private networks
the hops live on), so the address is taken from the header entries those hops
added and a forged entry from the internet is ignored. Development without a
proxy leaves it unset.

**Consequences.** Rate limits are per visitor again (tested both ways in
`throttling.e2e-spec.ts`). A deployment with another proxy in front (a CDN or
cloud load balancer) must add that proxy's address range to `TRUST_PROXY`, or
every visitor appears to come from the proxy. The limiter is in memory per API
instance; running several instances needs a shared store.


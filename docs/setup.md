# Local Setup Guide

## 1. Prerequisites

| Tool    | Version | Notes                                                        |
| ------- | ------- | ------------------------------------------------------------ |
| Node.js | 22+     | `.nvmrc` pins 22; Node 24 also works                         |
| MySQL   | 8.0+    | Local server; any time zone (the API pins sessions to UTC)   |
| Browser | Current Chrome, Edge, Firefox or Safari | `*.localhost` subdomains resolve to your machine |

## 2. API (`backend/`)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASS`,
  `DATABASE_NAME`: your local MySQL. The database is created for you.
- `JWT_SECRET`: run `npm run jwtsecret -- --write` to generate and store one.
- `PLATFORM_DOMAIN=localhost`: leave as-is for local development.
- `MEDIA_STORAGE=local` keeps uploaded images in `backend/uploads/r/{organizationId}/`
  (or `UPLOAD_DIR`), served at `/uploads`. Set `cloudinary` plus the
  `CLOUDINARY_*` values to store them there. `MEDIA_MAX_IMAGE_MB` (default 5)
  caps image size.
- `CUSTOMER_JWT_AUDIENCE` (default `app-storefront`) and
  `CUSTOMER_REFRESH_EXPIRES_IN` (default `30d`): storefront customer sessions
  (ADR-023). The defaults are fine locally.
- Without `SMTP_HOST`, emails (contact-form messages, customer and staff
  password-reset links) are printed in the API console.

Then:

```bash
npm run db:reset     # DROP + CREATE the database, run every migration, seed demo data
npm run start:dev    # http://localhost:3003/api/v1  (Swagger: /api/docs)
```

`db:reset` refuses to run unless the database host is local (`127.0.0.1`,
`localhost`, `::1`) and `NODE_ENV` is not `production`.

### Coming from the old boilerplate database

The boilerplate used `DATABASE_SYNC=true`, which built tables without
migration history. Such a database cannot take migrations in place, so:

1. Remove the `DATABASE_SYNC` line from `backend/.env` (it is now ignored
   with a warning).
2. Run `npm run db:reset`. This **drops** the database named in
   `DATABASE_NAME` and rebuilds it from migrations. Only do this for local
   development data you don't need.

## 3. Web app (`frontend/`)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` and `/uploads` to `VITE_DEV_API_TARGET`
(default `http://localhost:3003`), and `/sitemap.xml` and `/robots.txt` to the
API's per-host SEO files. The browser only ever talks to `:5173`, exactly as
in production behind nginx.

## 4. What to open

| URL                                                  | App                                         |
| ---------------------------------------------------- | ------------------------------------------- |
| http://localhost:5173                                | Platform directory                          |
| http://localhost:5173/s/northern-trails              | Northern Trails public website (path mode)  |
| http://northern-trails.localhost:5173                | Same website, resolved by host              |
| http://northern-trails.localhost:5173/contact        | Contact form → admin inbox + bell           |
| http://northern-trails.localhost:5173/account        | Customer account (register on the site)     |
| http://northern-trails.localhost:5173/sitemap.xml    | That website's sitemap                      |
| http://localhost:5173/admin                          | Admin portal (accounts below)               |
| http://localhost:5173/admin/1/website                | Website editors (home, banners, pages, …)   |
| http://localhost:5173/admin/1/customers              | Customers; the inbox is next to it          |
| http://localhost:5173/admin/1/team                   | Team members and roles                      |
| http://localhost:5173/s/northern-trails?preview=1    | The site with drafts (signed-in staff)      |

### Demo data and accounts

`db:reset` and `seed` create one demo organization, **Northern Trails**, and a
team with one account per role (never in production). Password
`Password123`, unless `SEED_DEMO_PASSWORD` is set. The demo website has home
sections, testimonials, FAQs and About/Privacy/Terms pages. Running `seed`
again only adds what is missing. Website drafts are visible with "Preview
with drafts" on the Website page; it works in the browser where you are
signed in to the admin, on the platform address (`localhost:5173/s/…`).

| Sign in as                          | Role and what you see                                          |
| ----------------------------------- | -------------------------------------------------------------- |
| `admin@example.com` / `Admin@123`   | Super admin: platform console, can open every organization     |
| `owner@northern-trails.example`     | Owner: everything, including domains and other owners          |
| `admin@northern-trails.example`     | Admin: everything except domains; manages managers and members |
| `manager@northern-trails.example`   | Manager: website, customers, inbox, media; manages members     |
| `member@northern-trails.example`    | Member: read-mostly; can upload images                         |

The full permission matrix is in
`backend/src/common/constants/roles.config.ts`.

## 5. Tests

```bash
# backend
npm test                                         # unit
DATABASE_NAME=tourism_platform_e2e npm run db:reset           # throwaway DB for e2e …
DATABASE_NAME=tourism_platform_e2e NODE_ENV=test npm run test:e2e
npm run db:verify                                # migrations applied + no entity drift

# frontend
npm run typecheck && npm test && npm run build
```

E2E tests **truncate tables**: never point them at a database you care about.
The full guide — the QA suite, `npm run db:consistency` and the browser
sweep (`npm run qa:sweep`) — is in [testing.md](testing.md).

## 6. Troubleshooting

| Symptom                                                    | Cause / fix                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| API exits with `Invalid environment configuration`         | A required variable is missing or invalid; the message names it                     |
| `JWT_SECRET is still the example placeholder`              | Run `npm run jwtsecret -- --write`                                                  |
| `npm run db:release` fails with `unsupported_schema`       | The DB was built by the old sync flow; see "Coming from the old boilerplate database" |
| `db:verify` reports `schema_drift`                         | Entities and migrations disagree; `npm run db:drift` prints the differing SQL       |
| Times shown hours off                                      | Sessions are pinned to UTC (ADR-015); check the organization's time zone in Settings |
| `northern-trails.localhost` does not load                        | Use a current browser, or use path mode `/s/northern-trails`                              |
| Web app shows "We couldn't load this page"                 | The API isn't running, or `VITE_DEV_API_TARGET` points elsewhere                    |
| Port 3003 / 5173 already in use                            | Change `PORT` (backend) and `VITE_DEV_API_TARGET`, or run `npx vite --port 5174`    |

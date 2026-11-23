# Tourism Platform

A multi-tenant platform foundation for tourism businesses:

- **Public websites:** every organization (tour operator, agency, …) gets its
  own branded public website: home sections, gallery, reviews, FAQs, pages,
  contact form and customer accounts.
- **Admin portal:** organizations and their teams manage everything from one
  portal, with Owner / Admin / Manager / Member roles.
- **API:** one NestJS API and one MySQL database behind both.

> **Status: clean foundation.** The original restaurant domain (menus,
> ordering, branches, promotions) has been removed; tourism features are added
> on top. Start with [`docs/README.md`](docs/README.md) and
> [`docs/adding-a-feature.md`](docs/adding-a-feature.md).

**Stack:**

- **API:** NestJS 11, TypeORM, MySQL 8.
- **Web:** React 19, Vite 8, TypeScript (strict), Tailwind CSS v4, TanStack
  Query, Zustand, React Hook Form + Zod, Radix UI primitives, Lucide icons.

---

## Quick start (local)

Requirements: Node 22+, MySQL 8 running locally. Full guide and
troubleshooting: [`docs/setup.md`](docs/setup.md).

**Terminal 1 — API** (`backend/`)

```bash
cd backend
npm install
cp .env.example .env            # then set DATABASE_* for your MySQL
npm run jwtsecret -- --write    # the API refuses to boot with the placeholder
npm run db:reset                # create DB, run migrations, seed demo data
npm run start:dev               # http://localhost:3003/api/v1
```

**Terminal 2 — web app** (`frontend/`)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                     # http://localhost:5173
```

The web app proxies `/api` and `/uploads` to the API, so everything is served
from one origin. Open:

| What                                   | URL                                          |
| -------------------------------------- | -------------------------------------------- |
| Organization directory                   | http://localhost:5173                        |
| Storefront, path mode                  | http://localhost:5173/s/northern-trails      |
| Storefront, own host (subdomain mode)  | http://northern-trails.localhost:5173        |
| Admin portal                           | http://localhost:5173/admin                  |
| API docs (Swagger, development only)   | http://localhost:3003/api/docs               |
| Health                                 | http://localhost:3003/api/health/live        |

**Seeded accounts and data (development only):**

- Super admin `admin@example.com` / `Admin@123` (override with
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).
- One demo organization, **Northern Trails**, with a team covering every
  role (`owner@`, `admin@`, `manager@`, `member@northern-trails.example`,
  password `Password123`) and sample website content.

---

## Project layout

```
backend/            NestJS API (independent npm project)
  src/common/       config, errors, guards, tenancy helpers, pagination, interceptors
  src/contracts/    response contracts → generated frontend types
  src/database/     entities (by domain), migrations, seeds, db tooling
  src/modules/      feature modules (auth, users, organizations, public, …)
frontend/           Vite + React + TypeScript (independent npm project)
  src/boot/         decides which app a URL belongs to
  src/apps/         storefront · admin · platform (directory), lazy-loaded
  src/shared/       api client, auth, UI primitives, design tokens, schemas
docs/               setup, adding a feature, decisions, testing, deployment, operations
mobile-app/         Expo + NativeWind starter shell (not wired to the API yet)
```

## Everyday commands

| Where       | Command                    | What it does                                                   |
| ----------- | -------------------------- | -------------------------------------------------------------- |
| `backend/`  | `npm run start:dev`        | API in watch mode                                              |
|             | `npm run db:reset`         | **Local only.** Drop + recreate the database, migrate, seed    |
|             | `npm run db:release`       | Apply pending migrations and verify the schema                 |
|             | `npm run db:verify`        | Check migrations are applied and entities match (no drift)     |
|             | `npm run seed`             | Idempotent development seed                                    |
|             | `npm test` / `npm run test:e2e` | Unit tests / API end-to-end tests (needs a throwaway DB)  |
|             | `npm run contracts:generate` | Regenerate `frontend/src/shared/types/api.generated.d.ts`    |
| `frontend/` | `npm run dev`              | Vite dev server with API proxy                                 |
|             | `npm run typecheck`        | Strict TypeScript check                                        |
|             | `npm test`                 | Unit tests (Vitest)                                            |
|             | `npm run build`            | Typecheck + production build                                   |
| both        | `npm run lint` / `npm run format:check` | ESLint / Prettier                                 |

`docker compose up --build` runs MySQL, the API (migrations on start) and the
web app behind nginx on http://localhost:8080. Set `JWT_SECRET` in
`backend/.env` first.

## License

MIT — see [LICENSE](LICENSE).

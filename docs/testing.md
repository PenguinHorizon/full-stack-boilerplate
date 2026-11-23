# Testing guide

How the platform is tested, how to run each layer, and what to add when you
change something.

## 1. The layers

| Layer | Where | What it proves | Speed |
| ----- | ----- | -------------- | ----- |
| Backend unit | `backend/src/**/*.spec.ts` (Jest) | The pure domain rules: money, phones, slugs, images, scoped queries, the role → permission matrix and team rules | Seconds |
| Backend e2e | `backend/test/*.e2e-spec.ts` (Jest + supertest, the real app and MySQL) | Every API flow end to end, with real validation, guards, transactions and SQL | ~1 min for all |
| QA suite | `backend/test/qa.e2e-spec.ts` | Driven by the routes Nest serves, so new routes are covered automatically: each route's declared permission is the one enforced for every role; no route answers 5xx to malformed bodies, ids or queries; errors always use the documented envelope; another organization's records are invisible through your own `:orgId` | ~30 s |
| Database consistency | `backend/src/database/consistency.ts` | Rules spanning tables: every organization has settings and an active owner, and every reference stays inside one organization. Asserted after every storefront test; add a rule for each new tenant-owned foreign key | Seconds |
| Frontend unit | `frontend/src/**/*.test.ts(x)` (Vitest + Testing Library) | Pure helpers (money, rich text, colours, links, time zones), form schemas, session state, routing and access gates | Seconds |
| Browser sweep | `tools/qa/sweep.mjs` (Playwright + axe-core, read-only) | The demo website (host and path mode) crawled at 1440/1024/768/360 px: console errors, failed API calls, broken images, missing alt text, sideways overflow, links that reach the 404 page, sitemap URLs, accessibility (axe); the admin opened as every demo role: each screen opens or is refused exactly as the role allows | ~35 min |

## 2. Running them

```bash
# Backend: unit
cd backend && npm test

# Backend: e2e — a throwaway database only (tables are truncated)
DATABASE_NAME=tourism_platform_e2e npm run db:init
DATABASE_NAME=tourism_platform_e2e NODE_ENV=test npm run test:e2e
DATABASE_NAME=tourism_platform_e2e NODE_ENV=test npx jest --config ./test/jest-e2e.json --runInBand test/qa.e2e-spec.ts   # one suite

# Backend: static checks
npm run lint && npm run format:check && npm run check:contracts

# Database: cross-table rules (read-only; exits 1 when a rule is broken)
npm run db:consistency           # the database in .env
DATABASE_NAME=tourism_platform_e2e npm run db:consistency

# Frontend
cd frontend && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build

# Browser sweep (API and web app running; demo data seeded)
cd tools/qa && npm install
QA_ORIGIN=http://localhost:5173 QA_API=http://localhost:3003/api/v1 npm run sweep
```

The sweep writes `tools/qa/report/summary.md` and `findings.json`. It only
reads: it signs in and opens pages, but never saves a form.

### Safety

- E2E tests **truncate every table** before each test. Point `DATABASE_NAME`
  at a database you can lose (`tourism_platform_e2e`), never at your working database.
- `db:consistency` and the sweep never write.
- The login endpoint is rate-limited (it should be). The sweep waits and
  retries when it is; running it twice in a row may take a minute longer.

## 3. When you change something

| Change | Add or update |
| ------ | ------------- |
| A pure rule (price, schedule, status) | A unit test next to it in `common/domain` |
| A new admin route | Nothing for access: the QA suite reads the route and its `@RequirePermissions`. Write a flow test in the module's e2e suite. A route that changes data must declare a permission, or be listed with a reason in `PERSONAL_WRITES` |
| A new permission | Use it on a route, or list it with a reason in `NOT_ON_A_ROUTE` (the suite fails otherwise) |
| A new record type addressed by id | Add it to the cross-organization map in `qa.e2e-spec.ts` (`idFor`) so another organization's copy is probed |
| A new table referencing another | Add the pair to `SAME_ORGANIZATION` in `consistency.ts`; a stored counter or total gets a rule in `RULES` |
| A storefront or admin screen | Run the sweep; it finds it through links (storefront) or add the path to its `routes` list (admin) |
| Test data set up with SQL | Keep it consistent (same organization on both sides of a reference), or the consistency check after the test fails — on purpose |

## 4. Reading failures

- **QA suite, "wrong"**: a route refused a role it should allow, or the
  reverse. Compare its `@RequirePermissions` with `ROLE_PERMISSIONS`.
- **QA suite, "crashed"**: a 5xx for bad input. Usually a missing
  validation pipe or an unchecked parse; reproduce with the printed request.
- **Consistency issue**: the check name says which rule; `sample` shows the
  rows. A failing check right after a test points at that test's flow.
- **Sweep, `access`**: a screen opened for a role that shouldn't see it (or
  was refused wrongly): compare the route's `RequirePermission` in
  `AdminApp.tsx` with the role's permissions.
- **Sweep, `overflow`**: the page is wider than the screen; the summary names
  the widest elements. A responsive grid needs a base `grid-cols-1`.

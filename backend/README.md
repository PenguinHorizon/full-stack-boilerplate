# Backend — NestJS API

REST API for the tourism platform: NestJS 11, TypeORM (MySQL 8), JWT access
tokens with rotating httpOnly refresh cookies.

- Versioned routes: `http://localhost:3003/api/v1/...`.
- Version-neutral health: `/api/health/live`, `/api/health/ready`.
- Swagger: `/api/docs` (development only).

```bash
npm install
cp .env.example .env
npm run jwtsecret -- --write   # JWT_SECRET into .env
npm run db:reset               # local only: recreate DB, migrate, seed
npm run start:dev
```

## Structure

```
src/
├── main.ts / app.setup.ts   bootstrap; configureApp() = prefix + URI versioning + cookies
├── app.module.ts            global guards, ValidationPipe, interceptors, exception filter
├── common/
│   ├── config/              env validation (boot fails on bad config)
│   ├── constants/           roles.config.ts (roles → permissions), tenancy.enums.ts
│   ├── errors/              ErrorCode, DomainException, field-level validation errors
│   ├── filters/             single error envelope { code, message, errors[], requestId }
│   ├── middlewares/         request id, request logging
│   ├── pagination/          Page<T> = { items, meta }, sort whitelists
│   ├── tenancy/             TenantContext, scoped queries, tenant helpers (ADR-002, ADR-010)
│   └── interceptors/        response envelope, public cache headers
├── contracts/               response classes → Swagger + generated frontend types
├── database/
│   ├── entities/<domain>/   identity, tenancy, website, customers, platform
│   ├── migrations/          InitSchema baseline + one reviewed migration per change
│   ├── seeds/               idempotent dev seeds (demo organizations)
│   └── utc-mysql-driver.ts  pins every MySQL session to UTC
└── modules/                 auth, users, access (roles/team), organizations, public,
                             content, customers, notifications, media, settings,
                             audit-log, mail, dashboard, health
```

## Database workflow

| Command                         | Use                                                                      |
| ------------------------------- | ------------------------------------------------------------------------ |
| `npm run db:reset`              | Local development: DROP + CREATE + migrate + seed (refuses non-local hosts) |
| `npm run db:release`            | Apply pending migrations with a lock, then verify                        |
| `npm run db:verify`             | Fail if migrations are pending or entities drift from the schema         |
| `npm run db:drift`              | Print the SQL TypeORM thinks is missing (diagnose drift)                 |
| `npm run migration:run` / `:prod` | Plain TypeORM migration run (`:prod` uses `dist/`, Docker entrypoint)  |
| `npm run seed`                  | Idempotent seed (demo organizations only outside production)               |

There is no `synchronize`. A leftover `DATABASE_SYNC` entry is ignored with a
warning. Entities are the source of truth: after changing them, run
`npm run migration:generate -- src/database/migrations/<Name>` against an
up-to-date local database, review the SQL, then `npm run db:verify`.

## Conventions

- **Responses:** `{ success, statusCode, message, data }`. Lists return
  `data: { items, meta: { page, pageSize, total, totalPages } }`.
- **Errors:** `{ success:false, statusCode, code, message, errors?:
  [{ field, message }], details?, requestId, path, timestamp }`.
- **Public endpoints** return explicit response DTOs, never entities.
- **Contracts:** after changing `src/contracts/*.contracts.ts`, run
  `npm run contracts:generate`. CI runs `npm run check:contracts`.

## Testing

```bash
npm test                                               # unit (Jest)
DATABASE_NAME=tourism_platform_e2e NODE_ENV=test npm run db:init    # throwaway DB
DATABASE_NAME=tourism_platform_e2e NODE_ENV=test npm run test:e2e   # API end-to-end (truncates tables!)
```

## Operations

Backup, release and mail tooling from the boilerplate is unchanged:
`backup:*`, `ops:check`, `ops:monitor`, `mail:*`. See `src/operations/`.

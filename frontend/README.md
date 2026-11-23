# Frontend — Vite + React + TypeScript

One Vite project, three lazily-loaded apps (ADR-004):

| App          | Where it runs                                   | Code                  |
| ------------ | ----------------------------------------------- | --------------------- |
| Storefront   | an organization's host, or `/s/{slug}`             | `src/apps/storefront` |
| Admin portal | `/admin/**` on any host                         | `src/apps/admin`      |
| Directory    | the platform host root                          | `src/apps/platform`   |

`src/boot/resolve-app.ts` decides which app a URL belongs to. Shared code
lives in `src/shared`:

- `api/`: typed client and endpoints.
- `auth/`: staff session.
- `ui/`: Radix-based primitives.
- `styles/`: design tokens.
- `schemas/`: Zod.
- `types/`: generated API contracts. Do not edit; run
  `npm run contracts:generate` in `backend/`.

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173 — proxies /api and /uploads to the API
npm run typecheck    # strict TS
npm test             # Vitest
npm run build        # typecheck + production build
```

**Design tokens.** Utilities are semantic (`bg-surface`, `text-ink-muted`,
`bg-accent`, `rounded-control`). Each app scope sets the underlying variables
on `<html data-app="…">`. The storefront takes the organization's brand colours
at runtime (`apps/storefront/theme/brand-theme.ts`).

See the root [README](../README.md) and [docs/setup.md](../docs/setup.md).

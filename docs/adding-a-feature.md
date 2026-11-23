# Adding a feature

The checklist for a new tenant-owned feature (for example **tours**). Follow
the existing `content` and `customers` modules as working examples.

## 1. Backend

1. **Entity** in `backend/src/database/entities/<area>/<name>.entity.ts`:
   - a non-null `organization_id` column with a `ManyToOne` to `Organization`;
   - every FK and index named explicitly (`foreignKeyConstraintName`, named
     `@Index`), indexes starting with `organization_id`;
   - money as `DECIMAL(12,2)` strings (ADR-011, `common/domain/money.ts`).

   Export it from `database/entities/index.ts`.
2. **Migration**: `npm run migration:generate -- src/database/migrations/AddTours`
   against your up-to-date local database; review the SQL, then
   `npm run db:release` and `npm run db:verify`.
3. **Permissions** in `common/constants/roles.config.ts`: add
   `tour.view` / `tour.manage` (or similar) and grant them to roles. Mirror the
   names in `frontend/src/shared/auth/access.ts` (a test checks they match).
   Update the role snapshot: `npx jest -u roles.config`.
4. **Module** in `backend/src/modules/<feature>/`:
   - admin controller under `admin/organizations/:orgId/<feature>` with
     `@OrganizationScoped()` and `@RequirePermissions(...)` on every route;
   - services take a `TenantContext` and query only through
     `scopeQuery` / `tenantWhere` (`common/tenancy/scoped-query.ts`);
     validate referenced ids with `assertIdsInOrganization` and slugs with
     `uniqueSlug` (`common/tenancy/tenant-helpers.ts`);
   - public reads go in `modules/public` (cached, `404 ORGANIZATION_UNAVAILABLE`
     for organizations that are not live);
   - audit writes with `AuditLogService`, notify staff with
     `NotificationsService.notifyPermitted(...)`.

   Register the module in `app.module.ts`.
5. **Contracts**: response classes in `src/contracts/<feature>.contracts.ts`,
   added to `contracts/responses.ts`; then `npm run contracts:generate`.
6. **Media**: if the feature references images, add a usage lookup in
   `MediaService.usage()` and a pair in `SAME_ORGANIZATION`
   (`database/consistency.ts`).

## 2. Frontend

1. API functions in `shared/api/` (typed with `shared/types/api.generated`)
   and query keys in `shared/api/query.ts`.
2. Zod form schemas in `shared/schemas/<feature>.ts` mirroring the DTOs.
3. Admin screens in `apps/admin/pages/organization/<feature>/`, routes in
   `apps/admin/AdminApp.tsx` wrapped in `<RequirePermission>`, and a nav entry
   in `apps/admin/nav.ts`.
4. Public pages in `apps/storefront/pages/`, routes in `StorefrontApp.tsx`,
   a nav entry in `layouts/SiteLayout.tsx`, and optionally a home section
   (`SectionKey` + `storefront-home.service.ts` + `HomePage.tsx`).

## 3. Tests

- Unit tests for pure rules next to them.
- An e2e flow in `backend/test/<feature>.e2e-spec.ts`.
- Add the new record type to `idFor` in `qa.e2e-spec.ts` so the
  cross-organization sweep probes it; the permission and robustness sweeps
  pick up new routes automatically.
- Add the admin paths to the browser sweep (`tools/qa/sweep.mjs`).

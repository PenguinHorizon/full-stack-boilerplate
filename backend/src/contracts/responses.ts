/*
 * Registry of every response contract exported to the frontend.
 * `npm run contracts:generate` turns these into
 * frontend/src/shared/types/api.generated.d.ts; CI fails if it is stale
 * (`npm run check:contracts`).
 *
 * Adding a feature: create `<feature>.contracts.ts`, then add it to both
 * lists below. Every exported class in a listed file is registered.
 */
import * as common from './common.contracts';
import * as content from './content.contracts';
import * as customers from './customers.contracts';
import * as identity from './identity.contracts';
import * as notifications from './notifications.contracts';
import * as publicSite from './public.contracts';
import * as storefront from './storefront.contracts';
import * as tenancy from './tenancy.contracts';

export * from './common.contracts';
export * from './content.contracts';
export * from './customers.contracts';
export * from './identity.contracts';
export * from './notifications.contracts';
export * from './public.contracts';
export * from './storefront.contracts';
export * from './tenancy.contracts';

const modules = [
  common,
  identity,
  publicSite,
  tenancy,
  storefront,
  content,
  customers,
  notifications,
];

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const responseModels: Function[] = modules.flatMap((module) =>
  Object.values(module).filter(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    (value): value is Function => typeof value === 'function',
  ),
);

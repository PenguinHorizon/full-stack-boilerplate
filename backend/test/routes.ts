import { INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import type { Permission } from '../src/common/constants/roles.config';
import {
  PERMISSIONS_KEY,
  PLATFORM_ONLY_KEY,
  ORGANIZATION_SCOPED_KEY,
} from '../src/common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface DiscoveredRoute {
  method: HttpMethod;
  /** Without the `/api/v1` prefix, e.g. `/admin/organizations/:orgId/team/:membershipId`. */
  path: string;
  /** The controller is @OrganizationScoped() (TenantGuard runs). */
  scoped: boolean;
  /** Every permission PermissionsGuard requires (handler metadata overrides the controller's). */
  permissions: Permission[];
  isPublic: boolean;
  platformOnly: boolean;
}

/** Handler metadata first, then the controller's — the same rule as Reflector.getAllAndOverride. */
function meta<T>(key: string, handler: object, controller: object): T | undefined {
  const own = Reflect.getMetadata(key, handler) as T | undefined;
  return own !== undefined
    ? own
    : (Reflect.getMetadata(key, controller) as T | undefined);
}

/** Every controller route, read from Nest's own metadata (nothing hand-listed). */
export function discoverRoutes(app: INestApplication): DiscoveredRoute[] {
  const all: DiscoveredRoute[] = [];
  for (const module of app.get(ModulesContainer).values()) {
    for (const wrapper of module.controllers.values()) {
      const controller = wrapper.metatype as (new (...args: never[]) => unknown) | null;
      if (!controller) continue;
      const base = String(Reflect.getMetadata(PATH_METADATA, controller) ?? '');
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = (controller.prototype as Record<string, unknown>)[name];
        if (name === 'constructor' || typeof handler !== 'function') continue;
        const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod;
        if (path === undefined || method === undefined) continue;
        all.push({
          method: RequestMethod[method].toLowerCase() as HttpMethod,
          path: `/${base}/${path}`.replace(/\/+/g, '/').replace(/\/$/, ''),
          scoped: Boolean(meta(ORGANIZATION_SCOPED_KEY, handler, controller)),
          permissions: meta<Permission[]>(PERMISSIONS_KEY, handler, controller) ?? [],
          isPublic: Boolean(meta(IS_PUBLIC_KEY, handler, controller)),
          platformOnly: Boolean(meta(PLATFORM_ONLY_KEY, handler, controller)),
        });
      }
    }
  }
  return all;
}

/** `/api/v1` + the path with `:orgId` filled in and every other parameter set to `other`. */
export function fillPath(
  path: string,
  orgId: number,
  other: string | number = 1,
): string {
  return `/api/v1${path.replace(':orgId', String(orgId)).replace(/:[A-Za-z]+/g, String(other))}`;
}

export const describeRoute = (route: Pick<DiscoveredRoute, 'method' | 'path'>) =>
  `${route.method.toUpperCase()} ${route.path}`;

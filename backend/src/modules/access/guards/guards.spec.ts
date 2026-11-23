import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PLATFORM_ONLY_KEY,
  ORGANIZATION_SCOPED_KEY,
} from '@common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { TENANT_REQUEST_KEY } from '@common/tenancy/tenant.decorator';
import { AccessService } from '../access.service';
import { PermissionsGuard } from './permissions.guard';
import { TenantGuard } from './tenant.guard';

function contextFor(
  request: Record<string, unknown>,
  metadata: Record<string, unknown>,
) {
  const reflector = {
    getAllAndOverride: (key: string) => metadata[key],
  } as unknown as Reflector;
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { reflector, ctx };
}

const user = {
  userId: 7,
  email: 'a@x.test',
  name: 'A',
  userCode: 'U7',
  isSuperAdmin: false,
};

describe('TenantGuard', () => {
  const tenant = { organizationId: 3, userId: 7, permissions: [] };
  const access = { resolveTenant: jest.fn().mockResolvedValue(tenant) };

  beforeEach(() => access.resolveTenant.mockClear());

  it('ignores routes that are not organization-scoped', async () => {
    const { reflector, ctx } = contextFor({ user, params: { orgId: '3' } }, {});
    await expect(
      new TenantGuard(reflector, access as unknown as AccessService).canActivate(ctx),
    ).resolves.toBe(true);
    expect(access.resolveTenant).not.toHaveBeenCalled();
  });

  it('resolves :orgId for the signed-in user and attaches the context', async () => {
    const request: Record<string, unknown> = { user, params: { orgId: '3' } };
    const { reflector, ctx } = contextFor(request, { [ORGANIZATION_SCOPED_KEY]: true });
    await new TenantGuard(reflector, access as unknown as AccessService).canActivate(
      ctx,
    );
    expect(access.resolveTenant).toHaveBeenCalledWith(7, 3);
    expect(request[TENANT_REQUEST_KEY]).toBe(tenant);
  });

  it.each(['abc', '0', '-1', '1.5'])('treats orgId %p as not found', async (orgId) => {
    const { reflector, ctx } = contextFor(
      { user, params: { orgId } },
      { [ORGANIZATION_SCOPED_KEY]: true },
    );
    await expect(
      new TenantGuard(reflector, access as unknown as AccessService).canActivate(ctx),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('PermissionsGuard', () => {
  const access = { isActiveSuperAdmin: jest.fn() };
  const guard = (
    metadata: Record<string, unknown>,
    request: Record<string, unknown>,
  ) => {
    const { reflector, ctx } = contextFor(request, metadata);
    return new PermissionsGuard(
      reflector,
      access as unknown as AccessService,
    ).canActivate(ctx);
  };

  beforeEach(() => access.isActiveSuperAdmin.mockReset());

  it('lets public routes through', async () => {
    await expect(
      guard({ [IS_PUBLIC_KEY]: true, [PLATFORM_ONLY_KEY]: true }, {}),
    ).resolves.toBe(true);
  });

  it('checks platform access in the database, not the token claim', async () => {
    access.isActiveSuperAdmin.mockResolvedValue(false);
    // The token says super admin, the database no longer does.
    await expect(
      guard({ [PLATFORM_ONLY_KEY]: true }, { user: { ...user, isSuperAdmin: true } }),
    ).rejects.toThrow(ForbiddenException);
    expect(access.isActiveSuperAdmin).toHaveBeenCalledWith(7);

    access.isActiveSuperAdmin.mockResolvedValue(true);
    await expect(guard({ [PLATFORM_ONLY_KEY]: true }, { user })).resolves.toBe(true);
  });

  it('requires every listed permission in the tenant context', async () => {
    const request = {
      user,
      [TENANT_REQUEST_KEY]: { permissions: ['team.view'] },
    };
    await expect(guard({ [PERMISSIONS_KEY]: ['team.view'] }, request)).resolves.toBe(
      true,
    );
    await expect(
      guard({ [PERMISSIONS_KEY]: ['team.view', 'team.manage'] }, request),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fails closed when permissions are declared without a tenant context', async () => {
    await expect(guard({ [PERMISSIONS_KEY]: ['team.view'] }, { user })).rejects.toThrow(
      ForbiddenException,
    );
  });
});

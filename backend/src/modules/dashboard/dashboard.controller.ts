import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  PlatformOnly,
  RequirePermissions,
  OrganizationScoped,
} from '@common/decorators/permissions.decorator';
import { TenantContext } from '@common/tenancy/tenant-context';
import { Tenant } from '@common/tenancy/tenant.decorator';
import {
  PlatformDashboardResponse,
  OrganizationDashboardResponse,
} from '@contracts/identity.contracts';
import { DashboardService } from './dashboard.service';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@OrganizationScoped()
@Controller('admin/organizations/:orgId/dashboard')
export class OrganizationDashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @RequirePermissions('dashboard.view')
  @ApiOkResponse({ type: OrganizationDashboardResponse })
  summary(@Tenant() tenant: TenantContext) {
    return this.dashboard.organization(tenant);
  }
}

@ApiTags('Platform - Dashboard')
@ApiBearerAuth()
@PlatformOnly()
@Controller('platform/dashboard')
export class PlatformDashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOkResponse({ type: PlatformDashboardResponse })
  summary() {
    return this.dashboard.platform();
  }
}

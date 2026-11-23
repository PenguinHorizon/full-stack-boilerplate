import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  PlatformOnly,
  RequirePermissions,
  OrganizationScoped,
} from '@common/decorators/permissions.decorator';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { PayloadDto } from '@common/dto/payload.dto';
import {
  CreateOrganizationDto,
  UpdatePlatformOrganizationDto,
} from '@common/dto/users.dto';
import { TenantContext } from '@common/tenancy/tenant-context';
import { Tenant } from '@common/tenancy/tenant.decorator';
import {
  PlatformOrganizationPageResponse,
  OrganizationAdminSummaryResponse,
} from '@contracts/identity.contracts';
import {
  OrganizationProfileResponse,
  OrganizationSettingsResponse,
} from '@contracts/tenancy.contracts';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import {
  UpdateOrganizationProfileDto,
  UpdateOrganizationSettingsDto,
} from './dto/profile.dto';
import { OrganizationAdminService } from './organization-admin.service';
import { OrganizationProfileService } from './organization-profile.service';

/** The organization's own profile, branding and settings. */
@ApiTags('Admin - Organization')
@ApiBearerAuth()
@OrganizationScoped()
@Controller('admin/organizations/:orgId')
export class OrganizationAdminController {
  constructor(
    private readonly profiles: OrganizationProfileService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @RequirePermissions('organization.view')
  @ApiOkResponse({ type: OrganizationProfileResponse })
  profile(@Tenant() tenant: TenantContext) {
    return this.profiles.profile(tenant.organizationId);
  }

  @Patch()
  @RequirePermissions('organization.update')
  @ApiOkResponse({ type: OrganizationProfileResponse })
  async updateProfile(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Body() dto: UpdateOrganizationProfileDto,
    @Req() req: Request,
  ) {
    const profile = await this.profiles.updateProfile(tenant, dto);
    await this.auditLog.record(req, {
      organizationId: tenant.organizationId,
      userId: actor.userId,
      userName: actor.name,
      action: 'organization.update',
      module: 'organization',
      entityType: 'organization',
      entityId: String(tenant.organizationId),
      description: `Updated the profile of ${profile.name}`,
      metadata: { fields: Object.keys(dto) },
    });
    return profile;
  }

  @Get('settings')
  @RequirePermissions('organization.view')
  @ApiOkResponse({ type: OrganizationSettingsResponse })
  settings(@Tenant() tenant: TenantContext) {
    return this.profiles.settings(tenant.organizationId);
  }

  @Patch('settings')
  @RequirePermissions('organization.update')
  @ApiOkResponse({ type: OrganizationSettingsResponse })
  async updateSettings(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Body() dto: UpdateOrganizationSettingsDto,
    @Req() req: Request,
  ) {
    const settings = await this.profiles.updateSettings(tenant, dto);
    await this.auditLog.record(req, {
      organizationId: tenant.organizationId,
      userId: actor.userId,
      userName: actor.name,
      action: 'organization.settings',
      module: 'organization',
      entityType: 'organization',
      entityId: String(tenant.organizationId),
      description: 'Updated organization settings',
      metadata: { changes: dto },
    });
    return settings;
  }
}

/** Platform onboarding and status management (super admins). */
@ApiTags('Platform - Organizations')
@ApiBearerAuth()
@PlatformOnly()
@Controller('platform/organizations')
export class PlatformOrganizationsController {
  constructor(
    private readonly organizations: OrganizationAdminService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiOkResponse({ type: PlatformOrganizationPageResponse })
  list(@Query() query: ListQueryDto) {
    return this.organizations.listForPlatform(query);
  }

  @Post()
  @ApiOkResponse({ type: OrganizationAdminSummaryResponse })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() actor: PayloadDto,
    @Req() req: Request,
  ) {
    const organization = await this.organizations.onboard(dto, actor.userId);
    await this.auditLog.record(req, {
      organizationId: organization.id,
      userId: actor.userId,
      userName: actor.name,
      action: 'organization.create',
      module: 'platform',
      entityType: 'organization',
      entityId: String(organization.id),
      description: `Onboarded ${organization.name} with owner ${dto.owner.email}`,
    });
    return this.organizations.summary(organization.id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: OrganizationAdminSummaryResponse })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlatformOrganizationDto,
    @CurrentUser() actor: PayloadDto,
    @Req() req: Request,
  ) {
    const organization = await this.organizations.updatePlatform(id, dto);
    await this.auditLog.record(req, {
      organizationId: organization.id,
      userId: actor.userId,
      userName: actor.name,
      action: 'organization.update',
      module: 'platform',
      entityType: 'organization',
      entityId: String(organization.id),
      description: `Updated ${organization.name}`,
      metadata: { changes: dto },
    });
    return this.organizations.summary(organization.id);
  }
}

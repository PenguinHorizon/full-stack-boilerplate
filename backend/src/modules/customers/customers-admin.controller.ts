import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  RequirePermissions,
  OrganizationScoped,
} from '@common/decorators/permissions.decorator';
import { PayloadDto } from '@common/dto/payload.dto';
import { TenantContext } from '@common/tenancy/tenant-context';
import { Tenant } from '@common/tenancy/tenant.decorator';
import {
  AdminCustomerDetailResponse,
  AdminCustomerPageResponse,
} from '@contracts/customers.contracts';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { CustomerListQueryDto, UpdateCustomerAdminDto } from './customers.dto';
import { CustomersAdminService } from './customers-admin.service';

/** Customers for staff. */
@ApiTags('Admin - Customers')
@ApiBearerAuth()
@OrganizationScoped()
@Controller('admin/organizations/:orgId/customers')
export class CustomersAdminController {
  constructor(
    private readonly customers: CustomersAdminService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @RequirePermissions('customer.view')
  @ApiOkResponse({ type: AdminCustomerPageResponse })
  list(@Tenant() tenant: TenantContext, @Query() query: CustomerListQueryDto) {
    return this.customers.list(tenant, query);
  }

  @Get(':id')
  @RequirePermissions('customer.view')
  @ApiOkResponse({ type: AdminCustomerDetailResponse })
  detail(@Tenant() tenant: TenantContext, @Param('id', ParseIntPipe) id: number) {
    return this.customers.detail(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('customer.manage')
  @ApiOperation({ summary: 'Block / unblock (signs them out), notes' })
  @ApiOkResponse({ type: AdminCustomerDetailResponse })
  async update(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerAdminDto,
    @Req() req: Request,
  ): Promise<AdminCustomerDetailResponse> {
    const { customer } = await this.customers.update(tenant, id, dto);
    if (dto.status !== undefined) {
      await this.auditLog.record(req, {
        organizationId: tenant.organizationId,
        userId: actor.userId,
        userName: actor.name,
        action: dto.status === 'blocked' ? 'customer.block' : 'customer.unblock',
        module: 'customers',
        entityType: 'customer',
        entityId: String(id),
        description: `${dto.status === 'blocked' ? 'Blocked' : 'Unblocked'} ${customer.name}`,
        metadata: dto.blockedReason ? { reason: dto.blockedReason } : undefined,
      });
    }
    return customer;
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  PlatformOnly,
  RequirePermissions,
  OrganizationScoped,
} from '@common/decorators/permissions.decorator';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { TenantContext } from '@common/tenancy/tenant-context';
import { Tenant } from '@common/tenancy/tenant.decorator';
import { AuditLogPageResponse } from '@contracts/identity.contracts';
import { AuditLogService } from './audit-log.service';

export class AuditQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({ example: 'user' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;
}

export class PlatformAuditQueryDto extends AuditQueryDto {
  @ApiPropertyOptional({ type: Number, description: 'Limit to one organization' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organizationId?: number;
}

/** The organization's own audit trail (owners and admins). */
@ApiTags('Admin - Audit log')
@ApiBearerAuth()
@OrganizationScoped()
@Controller('admin/organizations/:orgId/audit-logs')
export class OrganizationAuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @RequirePermissions('audit.view')
  @ApiOkResponse({ type: AuditLogPageResponse })
  list(@Tenant() tenant: TenantContext, @Query() query: AuditQueryDto) {
    return this.auditLog.list(
      {
        organizationId: tenant.organizationId,
        userId: query.userId,
        entityType: query.entityType,
      },
      query,
    );
  }
}

/** Every event on the platform (super admins). */
@ApiTags('Platform - Audit log')
@ApiBearerAuth()
@PlatformOnly()
@Controller('platform/audit-logs')
export class PlatformAuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @ApiOkResponse({ type: AuditLogPageResponse })
  list(@Query() query: PlatformAuditQueryDto) {
    return this.auditLog.list(
      {
        organizationId: query.organizationId,
        userId: query.userId,
        entityType: query.entityType,
      },
      query,
    );
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ROLE_LABELS } from '@common/constants/roles.config';
import {
  RequirePermissions,
  OrganizationScoped,
} from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { PayloadDto } from '@common/dto/payload.dto';
import { AddTeamMemberDto, UpdateTeamMemberDto } from '@common/dto/users.dto';
import { TenantContext } from '@common/tenancy/tenant-context';
import { Tenant } from '@common/tenancy/tenant.decorator';
import {
  MessageResponse,
  TeamMemberPageResponse,
  TeamMemberResponse,
} from '@contracts/identity.contracts';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { TeamService } from './team.service';

@ApiTags('Admin - Team')
@ApiBearerAuth()
@OrganizationScoped()
@Controller('admin/organizations/:orgId/team')
export class TeamController {
  constructor(
    private readonly team: TeamService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @RequirePermissions('team.view')
  @ApiOkResponse({ type: TeamMemberPageResponse })
  list(@Tenant() tenant: TenantContext, @Query() query: ListQueryDto) {
    return this.team.list(tenant, query);
  }

  @Post()
  @RequirePermissions('team.manage')
  @ApiOkResponse({ type: TeamMemberResponse })
  async add(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Body() dto: AddTeamMemberDto,
    @Req() req: Request,
  ) {
    const member = await this.team.add(tenant, dto);
    await this.auditLog.record(req, {
      organizationId: tenant.organizationId,
      userId: actor.userId,
      userName: actor.name,
      action: 'team.add',
      module: 'team',
      entityType: 'membership',
      entityId: String(member.id),
      description: `Added ${member.user.email} as ${ROLE_LABELS[member.role]}`,
      metadata: { role: member.role },
    });
    return member;
  }

  @Patch(':membershipId')
  @RequirePermissions('team.manage')
  @ApiOkResponse({ type: TeamMemberResponse })
  async update(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('membershipId', ParseIntPipe) membershipId: number,
    @Body() dto: UpdateTeamMemberDto,
    @Req() req: Request,
  ) {
    const member = await this.team.update(tenant, membershipId, dto);
    await this.auditLog.record(req, {
      organizationId: tenant.organizationId,
      userId: actor.userId,
      userName: actor.name,
      action: 'team.update',
      module: 'team',
      entityType: 'membership',
      entityId: String(member.id),
      description: `Updated ${member.user.email} (${ROLE_LABELS[member.role]})`,
      metadata: { changes: dto },
    });
    return member;
  }

  @Delete(':membershipId')
  @RequirePermissions('team.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponse })
  async remove(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('membershipId', ParseIntPipe) membershipId: number,
    @Req() req: Request,
  ) {
    const member = await this.team.remove(tenant, membershipId);
    await this.auditLog.record(req, {
      organizationId: tenant.organizationId,
      userId: actor.userId,
      userName: actor.name,
      action: 'team.remove',
      module: 'team',
      entityType: 'membership',
      entityId: String(member.id),
      description: `Removed ${member.user.email} from the team`,
    });
    return { message: `${member.user.name} was removed from the team.` };
  }

  @Post(':membershipId/password-reset')
  @RequirePermissions('team.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponse })
  async passwordReset(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('membershipId', ParseIntPipe) membershipId: number,
    @Req() req: Request,
  ) {
    const member = await this.team.sendPasswordReset(tenant, membershipId);
    await this.auditLog.record(req, {
      organizationId: tenant.organizationId,
      userId: actor.userId,
      userName: actor.name,
      action: 'team.password_reset',
      module: 'team',
      entityType: 'membership',
      entityId: String(member.id),
      description: `Sent a password reset link to ${member.user.email}`,
    });
    return { message: `A reset link was sent to ${member.user.email}.` };
  }
}

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { OrganizationScoped } from '@common/decorators/permissions.decorator';
import { TenantContext } from '@common/tenancy/tenant-context';
import { Tenant } from '@common/tenancy/tenant.decorator';
import { MessageResponse } from '@contracts/identity.contracts';
import {
  NotificationListResponse,
  NotificationResponse,
} from '@contracts/notifications.contracts';
import { NotificationsService } from './notifications.service';

export class NotificationListQueryDto {
  @ApiPropertyOptional({ description: 'Only unread' })
  @IsOptional()
  @IsIn(['true', 'false'])
  unread?: 'true' | 'false';
}

/** The staff member's own in-app notifications (the bell). */
@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@OrganizationScoped()
@Controller('admin/organizations/:orgId/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOkResponse({ type: NotificationListResponse })
  list(@Tenant() tenant: TenantContext, @Query() query: NotificationListQueryDto) {
    return this.notifications.list(tenant, query.unread === 'true');
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponse })
  async readAll(@Tenant() tenant: TenantContext): Promise<MessageResponse> {
    const count = await this.notifications.markAllRead(tenant);
    return { message: `${count} marked as read` };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: NotificationResponse })
  read(@Tenant() tenant: TenantContext, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.markRead(tenant, id);
  }
}

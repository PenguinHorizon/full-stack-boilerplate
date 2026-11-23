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
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PlatformOnly } from '@common/decorators/permissions.decorator';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { PayloadDto } from '@common/dto/payload.dto';
import { UpdatePlatformUserDto } from '@common/dto/users.dto';
import {
  MessageResponse,
  PlatformUserPageResponse,
  PlatformUserResponse,
} from '@contracts/identity.contracts';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { UsersService } from './users.service';

/** Every staff account on the platform (super admins). */
@ApiTags('Platform - Users')
@ApiBearerAuth()
@PlatformOnly()
@Controller('platform/users')
export class PlatformUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiOkResponse({ type: PlatformUserPageResponse })
  list(@Query() query: ListQueryDto) {
    return this.users.list(query);
  }

  @Patch(':id')
  @ApiOkResponse({ type: PlatformUserResponse })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlatformUserDto,
    @CurrentUser() actor: PayloadDto,
    @Req() req: Request,
  ) {
    const user = await this.users.updatePlatform(id, dto, actor);
    await this.auditLog.record(req, {
      userId: actor.userId,
      userName: actor.name,
      action: 'user.update',
      module: 'platform',
      entityType: 'user',
      entityId: String(user.id),
      description: `Updated ${user.email}`,
      metadata: { changes: dto },
    });
    return this.users.getRow(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: PayloadDto,
    @Req() req: Request,
  ) {
    const user = await this.users.findOne(id);
    await this.users.remove(id, actor);
    await this.auditLog.record(req, {
      userId: actor.userId,
      userName: actor.name,
      action: 'user.delete',
      module: 'platform',
      entityType: 'user',
      entityId: String(id),
      description: `Removed ${user.email}`,
    });
    return { message: `${user.name} was removed.` };
  }
}

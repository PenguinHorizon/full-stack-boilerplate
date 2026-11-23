import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PlatformOnly } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PayloadDto } from '@common/dto/payload.dto';
import {
  BulkUpdateSettingsDto,
  CreateSystemSettingsDto,
  SystemSettingsDto,
  UpdateSystemSettingsDto,
} from '@common/dto/system-settings.dto';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { SystemSettingsService } from './system-settings.service';

/**
 * Platform-level key/value settings (super admins). Organization settings
 * live in `organization_settings` (PATCH /admin/organizations/:orgId/settings).
 *
 * The boilerplate's anonymous `GET /system/settings` is gone: storefronts
 * read organization data from the public site bootstrap instead.
 */
@ApiTags('Platform - Settings')
@ApiBearerAuth()
@PlatformOnly()
@Controller('platform/settings')
export class SystemSettingsController {
  constructor(
    private readonly settingsService: SystemSettingsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiResponse({ status: 200 })
  async findAll() {
    return this.settingsService.toMap(await this.settingsService.findAll());
  }

  @Get(':key')
  @ApiResponse({ status: 200, type: SystemSettingsDto })
  async findOne(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @Post()
  @ApiResponse({ status: 201, type: SystemSettingsDto })
  async create(@Body() dto: CreateSystemSettingsDto) {
    return this.settingsService.create(dto);
  }

  @Put()
  @ApiResponse({ status: 200 })
  async updateBulk(
    @Body() dto: BulkUpdateSettingsDto,
    @CurrentUser() actor: PayloadDto,
    @Req() req: Request,
  ) {
    const result = await this.settingsService.upsertBulk(dto.settings);
    await this.auditLog.record(req, {
      userId: actor.userId,
      userName: actor.name,
      action: 'settings.update',
      module: 'platform',
      description: 'Updated platform settings',
      metadata: { keys: Object.keys(dto.settings) },
    });
    return result;
  }

  @Put(':key')
  @ApiResponse({ status: 200, type: SystemSettingsDto })
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateSystemSettingsDto,
    @CurrentUser() actor: PayloadDto,
    @Req() req: Request,
  ) {
    const result = await this.settingsService.update(key, dto);
    await this.auditLog.record(req, {
      userId: actor.userId,
      userName: actor.name,
      action: 'settings.update',
      module: 'platform',
      description: `Updated platform setting "${key}"`,
    });
    return result;
  }
}

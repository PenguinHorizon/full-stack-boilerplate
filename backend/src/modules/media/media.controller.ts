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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  RequirePermissions,
  OrganizationScoped,
} from '@common/decorators/permissions.decorator';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { PayloadDto } from '@common/dto/payload.dto';
import { TenantContext } from '@common/tenancy/tenant-context';
import { Tenant } from '@common/tenancy/tenant.decorator';
import { MessageResponse } from '@contracts/identity.contracts';
import { MediaAssetResponse, MediaPageResponse } from '@contracts/tenancy.contracts';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { UpdateMediaDto, UploadMediaDto } from './media.dto';
import { MediaService, UploadedImage } from './media.service';

/** Multer's ceiling; the configurable limit (MEDIA_MAX_IMAGE_MB) is checked in the service. */
const HARD_LIMIT_BYTES = 20 * 1024 * 1024;

@ApiTags('Admin - Media')
@ApiBearerAuth()
@OrganizationScoped()
@Controller('admin/organizations/:orgId/media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @RequirePermissions('media.view')
  @ApiOkResponse({ type: MediaPageResponse })
  list(@Tenant() tenant: TenantContext, @Query() query: ListQueryDto) {
    return this.media.list(tenant, query);
  }

  @Post()
  @RequirePermissions('media.upload')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        altText: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ type: MediaAssetResponse })
  // Guards run first, so files from callers without access are never read.
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: HARD_LIMIT_BYTES, files: 1, fields: 5 },
    }),
  )
  async upload(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @UploadedFile() file: UploadedImage | undefined,
    @Body() dto: UploadMediaDto,
    @Req() req: Request,
  ) {
    const asset = await this.media.upload(tenant, file, dto.altText ?? null);
    await this.auditLog.record(req, {
      organizationId: tenant.organizationId,
      userId: actor.userId,
      userName: actor.name,
      action: 'media.upload',
      module: 'media',
      entityType: 'media',
      entityId: String(asset.id),
      description: `Uploaded ${asset.originalName ?? 'an image'}`,
      metadata: { sizeBytes: asset.sizeBytes, mimeType: asset.mimeType },
    });
    return asset;
  }

  @Patch(':id')
  @RequirePermissions('media.upload')
  @ApiOkResponse({ type: MediaAssetResponse })
  update(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.media.update(tenant, id, dto.altText ?? null);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('media.delete')
  @ApiOkResponse({ type: MessageResponse })
  async remove(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const asset = await this.media.remove(tenant, id);
    await this.auditLog.record(req, {
      organizationId: tenant.organizationId,
      userId: actor.userId,
      userName: actor.name,
      action: 'media.delete',
      module: 'media',
      entityType: 'media',
      entityId: String(id),
      description: `Deleted ${asset.originalName ?? 'an image'}`,
    });
    return { message: 'Image deleted.' };
  }
}

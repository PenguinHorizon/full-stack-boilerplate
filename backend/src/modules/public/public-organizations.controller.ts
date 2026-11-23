import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PublicCacheInterceptor } from '@common/interceptors/public-cache.interceptor';
import { ApiErrorResponse } from '@contracts/common.contracts';
import {
  OrganizationDirectoryPageResponse,
  SiteBootstrapResponse,
  SiteResolveResponse,
} from '@contracts/public.contracts';
import { MessageResponse } from '@contracts/identity.contracts';
import {
  DirectoryQueryDto,
  ResolveSiteQueryDto,
  TlsCheckQueryDto,
} from '@modules/organizations/dto/directory-query.dto';
import { OrganizationsService } from '@modules/organizations/organizations.service';
import { StorefrontContentService } from './storefront-content.service';
import { StorefrontPreviewService } from './storefront-preview.service';

/**
 * Anonymous storefront reads (`/api/v1/public/...`). Only active organizations
 * with their website switched on are visible; everything else is the same
 * `404 ORGANIZATION_UNAVAILABLE`, so drafts cannot be probed.
 */
@Public()
@ApiTags('Public - Storefront')
@UseInterceptors(PublicCacheInterceptor)
@Controller('public')
export class PublicOrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly content: StorefrontContentService,
    private readonly preview: StorefrontPreviewService,
  ) {}

  @Get('sites/resolve')
  @ApiOperation({ summary: 'Resolve a storefront host to an organization (ADR-003)' })
  @ApiOkResponse({ type: SiteResolveResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  resolve(@Query() query: ResolveSiteQueryDto): Promise<SiteResolveResponse> {
    return this.organizations.resolveHost(query.host);
  }

  @Get('sites/tls-check')
  @ApiOperation({
    summary:
      'Edge TLS: may a certificate be issued for this host? (Caddy on_demand_tls ask)',
  })
  @ApiOkResponse({ type: MessageResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  async tlsCheck(@Query() query: TlsCheckQueryDto): Promise<MessageResponse> {
    if (!(await this.organizations.isServedHost(query.domain))) {
      throw new NotFoundException('This platform does not serve that host');
    }
    return { message: 'ok' };
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Platform directory of organizations' })
  @ApiOkResponse({ type: OrganizationDirectoryPageResponse })
  directory(@Query() query: DirectoryQueryDto) {
    return this.organizations.listPublic(query);
  }

  @Get('organizations/:slug')
  @ApiOperation({
    summary: 'Storefront bootstrap: profile, branding, ordering flags, SEO',
  })
  @ApiOkResponse({ type: SiteBootstrapResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  bootstrap(
    @Param('slug') slug: string,
    @Req() req: Request,
  ): Promise<SiteBootstrapResponse> {
    return this.organizations.getSiteBootstrap(slug, async (record) =>
      this.content.navigation(record, await this.preview.includeDrafts(req, record.id)),
    );
  }
}

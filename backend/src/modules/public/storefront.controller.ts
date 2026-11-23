import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PageKey } from '@common/constants/website';
import { Public } from '@common/decorators/public.decorator';
import { PublicCacheInterceptor } from '@common/interceptors/public-cache.interceptor';
import { ApiErrorResponse } from '@contracts/common.contracts';
import { MessageResponse } from '@contracts/identity.contracts';
import {
  FaqGroupResponse,
  GalleryResponse,
  HomeResponse,
  SitePageResponse,
} from '@contracts/storefront.contracts';
import { OrganizationsService } from '@modules/organizations/organizations.service';
import { CreateInquiryDto, GalleryQueryDto } from './storefront.dto';
import { StorefrontContentService } from './storefront-content.service';
import { StorefrontHomeService } from './storefront-home.service';
import { StorefrontPreviewService } from './storefront-preview.service';
import { StorefrontSeoService } from './storefront-seo.service';

/**
 * The storefront's reads (`/public/organizations/:slug/...`). Every one
 * answers `404 ORGANIZATION_UNAVAILABLE` for organizations that are not live, so
 * drafts cannot be probed, and is cached briefly (30 s) like the bootstrap.
 */
@Public()
@ApiTags('Public - Storefront')
@Controller('public/organizations/:slug')
export class StorefrontController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly content: StorefrontContentService,
    private readonly homeService: StorefrontHomeService,
    private readonly preview: StorefrontPreviewService,
  ) {}

  @Get('home')
  @UseInterceptors(PublicCacheInterceptor)
  @ApiOperation({ summary: 'Home sections with their content' })
  @ApiOkResponse({ type: HomeResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  async home(@Param('slug') slug: string, @Req() req: Request) {
    const organization = await this.organizations.findPublicBySlug(slug);
    return this.homeService.home(
      organization,
      await this.preview.includeDrafts(req, organization.id),
    );
  }

  @Get('pages/:key')
  @UseInterceptors(PublicCacheInterceptor)
  @ApiOkResponse({ type: SitePageResponse })
  async page(
    @Param('slug') slug: string,
    @Param('key', new ParseEnumPipe(PageKey)) key: PageKey,
    @Req() req: Request,
  ) {
    const organization = await this.organizations.findPublicBySlug(slug);
    return this.content.page(
      organization.id,
      key,
      await this.preview.includeDrafts(req, organization.id),
    );
  }

  @Get('faqs')
  @UseInterceptors(PublicCacheInterceptor)
  @ApiOkResponse({ type: [FaqGroupResponse] })
  async faqs(@Param('slug') slug: string, @Req() req: Request) {
    const organization = await this.organizations.findPublicBySlug(slug);
    return this.content.faqs(
      organization.id,
      await this.preview.includeDrafts(req, organization.id),
    );
  }

  @Get('gallery')
  @UseInterceptors(PublicCacheInterceptor)
  @ApiOkResponse({ type: GalleryResponse })
  async gallery(
    @Param('slug') slug: string,
    @Query() query: GalleryQueryDto,
    @Req() req: Request,
  ) {
    const organization = await this.organizations.findPublicBySlug(slug);
    return this.content.gallery(
      organization.id,
      query.tag,
      undefined,
      await this.preview.includeDrafts(req, organization.id),
    );
  }

  @Post('inquiries')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Contact form → stored for the inbox, staff notified and emailed',
  })
  @ApiCreatedResponse({ type: MessageResponse })
  async inquire(
    @Param('slug') slug: string,
    @Body() dto: CreateInquiryDto,
    @Req() req: Request,
  ) {
    const organization = await this.organizations.findPublicBySlug(slug);
    await this.content.createInquiry(organization, dto, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return {
      message: 'Thanks — your message has been sent. We’ll get back to you soon.',
    };
  }
}

/** Per-host SEO files; nginx maps `/sitemap.xml` and `/robots.txt` here. */
@Public()
@ApiTags('Public - Storefront')
@Controller('public/seo')
export class StorefrontSeoController {
  constructor(private readonly seo: StorefrontSeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiProduces('application/xml')
  sitemap(@Query('host') host: string | undefined, @Req() req: Request) {
    return this.seo.sitemap(host ?? hostOf(req), protocolOf(req));
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiProduces('text/plain')
  robots(@Query('host') host: string | undefined, @Req() req: Request) {
    return this.seo.robots(host ?? hostOf(req), protocolOf(req));
  }
}

const hostOf = (req: Request) =>
  String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
    .split(',')[0]
    .trim();

const protocolOf = (req: Request) => {
  const forwarded = String(req.headers['x-forwarded-proto'] ?? '')
    .split(',')[0]
    .trim();
  return forwarded === 'https' || forwarded === 'http' ? forwarded : req.protocol;
};

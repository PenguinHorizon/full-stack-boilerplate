import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PageKey } from '@common/constants/website';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  RequirePermissions,
  OrganizationScoped,
} from '@common/decorators/permissions.decorator';
import { PayloadDto } from '@common/dto/payload.dto';
import { TenantContext } from '@common/tenancy/tenant-context';
import { Tenant } from '@common/tenancy/tenant.decorator';
import {
  AdminBannerResponse,
  AdminFaqResponse,
  AdminGalleryImageResponse,
  AdminPageResponse,
  AdminSectionResponse,
  AdminTestimonialResponse,
  CreatedIdResponse,
  InquiryPageResponse,
  InquiryResponse,
} from '@contracts/content.contracts';
import { MessageResponse } from '@contracts/identity.contracts';
import {
  Banner,
  Faq,
  GalleryImage,
  Testimonial,
} from '@database/entities/website/content.entity';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import {
  BannerInputDto,
  ContentListQueryDto,
  FaqInputDto,
  GalleryInputDto,
  InquiryListQueryDto,
  PageInputDto,
  ReorderDto,
  SectionsInputDto,
  TestimonialInputDto,
  UpdateBannerDto,
  UpdateFaqDto,
  UpdateGalleryDto,
  UpdateInquiryDto,
  UpdateTestimonialDto,
} from './content.dto';
import { ContentService } from './content.service';

/** Website editors. */
@ApiTags('Admin - Website content')
@ApiBearerAuth()
@OrganizationScoped()
@Controller('admin/organizations/:orgId/content')
export class ContentController {
  constructor(
    private readonly content: ContentService,
    private readonly auditLog: AuditLogService,
  ) {}

  private audit(
    req: Request,
    tenant: TenantContext,
    actor: PayloadDto,
    action: string,
    entity: { type: string; id: string | number },
    description: string,
  ) {
    return this.auditLog.record(req, {
      organizationId: tenant.organizationId,
      userId: actor.userId,
      userName: actor.name,
      action,
      module: 'content',
      entityType: entity.type,
      entityId: String(entity.id),
      description,
    });
  }

  /* ── Home sections ───────────────────────────────────────────────── */

  @Get('sections')
  @RequirePermissions('content.view')
  @ApiOkResponse({ type: [AdminSectionResponse] })
  sections(@Tenant() tenant: TenantContext) {
    return this.content.sections(tenant);
  }

  @Put('sections')
  @RequirePermissions('content.manage')
  @ApiOperation({ summary: 'Every home section, in display order' })
  @ApiOkResponse({ type: [AdminSectionResponse] })
  async replaceSections(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Body() dto: SectionsInputDto,
    @Req() req: Request,
  ) {
    const result = await this.content.replaceSections(tenant, dto);
    await this.audit(
      req,
      tenant,
      actor,
      'content.sections',
      { type: 'website', id: tenant.organizationId },
      'Updated the home page sections',
    );
    return result;
  }

  /* ── Banners ─────────────────────────────────────────────────────── */

  @Get('banners')
  @RequirePermissions('content.view')
  @ApiOkResponse({ type: [AdminBannerResponse] })
  banners(@Tenant() tenant: TenantContext, @Query() query: ContentListQueryDto) {
    return this.content.banners(tenant, query);
  }

  @Post('banners')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: CreatedIdResponse })
  async createBanner(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Body() dto: BannerInputDto,
    @Req() req: Request,
  ): Promise<{ id: number }> {
    const row = await this.content.createBanner(tenant, dto);
    await this.audit(
      req,
      tenant,
      actor,
      'banner.create',
      { type: 'banner', id: row.id },
      `Added banner “${row.internalName}”`,
    );
    return { id: row.id };
  }

  @Put('banners/order')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: MessageResponse })
  async orderBanners(@Tenant() tenant: TenantContext, @Body() dto: ReorderDto) {
    await this.content.reorder(Banner, tenant, dto);
    return { message: 'Order saved' };
  }

  @Patch('banners/:id')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: CreatedIdResponse })
  async updateBanner(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto,
    @Req() req: Request,
  ): Promise<{ id: number }> {
    const row = await this.content.updateBanner(tenant, id, dto);
    await this.audit(
      req,
      tenant,
      actor,
      'banner.update',
      { type: 'banner', id },
      `Updated banner “${row.internalName}”`,
    );
    return { id };
  }

  @Delete('banners/:id')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: MessageResponse })
  async deleteBanner(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const row = await this.content.remove(Banner, tenant, id, 'Banner');
    await this.audit(
      req,
      tenant,
      actor,
      'banner.delete',
      { type: 'banner', id },
      `Deleted banner “${row.internalName}”`,
    );
    return { message: 'Banner deleted' };
  }

  /* ── Gallery ─────────────────────────────────────────────────────── */

  @Get('gallery')
  @RequirePermissions('content.view')
  @ApiOkResponse({ type: [AdminGalleryImageResponse] })
  gallery(@Tenant() tenant: TenantContext) {
    return this.content.gallery(tenant);
  }

  @Post('gallery')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: CreatedIdResponse })
  async createGallery(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Body() dto: GalleryInputDto,
    @Req() req: Request,
  ): Promise<{ id: number }> {
    const row = await this.content.createGallery(tenant, dto);
    await this.audit(
      req,
      tenant,
      actor,
      'gallery.create',
      { type: 'gallery', id: row.id },
      'Added a gallery photo',
    );
    return { id: row.id };
  }

  @Put('gallery/order')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: MessageResponse })
  async orderGallery(@Tenant() tenant: TenantContext, @Body() dto: ReorderDto) {
    await this.content.reorder(GalleryImage, tenant, dto);
    return { message: 'Order saved' };
  }

  @Patch('gallery/:id')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: CreatedIdResponse })
  async updateGallery(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGalleryDto,
  ): Promise<{ id: number }> {
    await this.content.updateGallery(tenant, id, dto);
    return { id };
  }

  @Delete('gallery/:id')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: MessageResponse })
  async deleteGallery(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    await this.content.remove(GalleryImage, tenant, id, 'Photo');
    await this.audit(
      req,
      tenant,
      actor,
      'gallery.delete',
      { type: 'gallery', id },
      'Removed a gallery photo',
    );
    return { message: 'Photo removed' };
  }

  /* ── Testimonials ────────────────────────────────────────────────── */

  @Get('testimonials')
  @RequirePermissions('content.view')
  @ApiOkResponse({ type: [AdminTestimonialResponse] })
  testimonials(@Tenant() tenant: TenantContext) {
    return this.content.testimonials(tenant);
  }

  @Post('testimonials')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: CreatedIdResponse })
  async createTestimonial(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Body() dto: TestimonialInputDto,
    @Req() req: Request,
  ): Promise<{ id: number }> {
    const row = await this.content.createTestimonial(tenant, dto);
    await this.audit(
      req,
      tenant,
      actor,
      'testimonial.create',
      { type: 'testimonial', id: row.id },
      `Added ${row.authorName}’s testimonial`,
    );
    return { id: row.id };
  }

  @Put('testimonials/order')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: MessageResponse })
  async orderTestimonials(@Tenant() tenant: TenantContext, @Body() dto: ReorderDto) {
    await this.content.reorder(Testimonial, tenant, dto);
    return { message: 'Order saved' };
  }

  @Patch('testimonials/:id')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: CreatedIdResponse })
  async updateTestimonial(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTestimonialDto,
  ): Promise<{ id: number }> {
    await this.content.updateTestimonial(tenant, id, dto);
    return { id };
  }

  @Delete('testimonials/:id')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: MessageResponse })
  async deleteTestimonial(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const row = await this.content.remove(Testimonial, tenant, id, 'Testimonial');
    await this.audit(
      req,
      tenant,
      actor,
      'testimonial.delete',
      { type: 'testimonial', id },
      `Deleted ${row.authorName}’s testimonial`,
    );
    return { message: 'Testimonial deleted' };
  }

  /* ── FAQs ────────────────────────────────────────────────────────── */

  @Get('faqs')
  @RequirePermissions('content.view')
  @ApiOkResponse({ type: [AdminFaqResponse] })
  faqs(@Tenant() tenant: TenantContext) {
    return this.content.faqs(tenant);
  }

  @Post('faqs')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: CreatedIdResponse })
  async createFaq(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Body() dto: FaqInputDto,
    @Req() req: Request,
  ): Promise<{ id: number }> {
    const row = await this.content.createFaq(tenant, dto);
    await this.audit(
      req,
      tenant,
      actor,
      'faq.create',
      { type: 'faq', id: row.id },
      `Added FAQ “${row.question}”`,
    );
    return { id: row.id };
  }

  @Put('faqs/order')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: MessageResponse })
  async orderFaqs(@Tenant() tenant: TenantContext, @Body() dto: ReorderDto) {
    await this.content.reorder(Faq, tenant, dto);
    return { message: 'Order saved' };
  }

  @Patch('faqs/:id')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: CreatedIdResponse })
  async updateFaq(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFaqDto,
  ): Promise<{ id: number }> {
    await this.content.updateFaq(tenant, id, dto);
    return { id };
  }

  @Delete('faqs/:id')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: MessageResponse })
  async deleteFaq(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const row = await this.content.remove(Faq, tenant, id, 'Question');
    await this.audit(
      req,
      tenant,
      actor,
      'faq.delete',
      { type: 'faq', id },
      `Deleted FAQ “${row.question}”`,
    );
    return { message: 'Question deleted' };
  }

  /* ── Pages ───────────────────────────────────────────────────────── */

  @Get('pages/:key')
  @RequirePermissions('content.view')
  @ApiOkResponse({ type: AdminPageResponse })
  page(
    @Tenant() tenant: TenantContext,
    @Param('key', new ParseEnumPipe(PageKey)) key: PageKey,
  ) {
    return this.content.page(tenant, key);
  }

  @Put('pages/:key')
  @RequirePermissions('content.manage')
  @ApiOkResponse({ type: AdminPageResponse })
  async putPage(
    @Tenant() tenant: TenantContext,
    @CurrentUser() actor: PayloadDto,
    @Param('key', new ParseEnumPipe(PageKey)) key: PageKey,
    @Body() dto: PageInputDto,
    @Req() req: Request,
  ) {
    const page = await this.content.putPage(tenant, key, dto);
    await this.audit(
      req,
      tenant,
      actor,
      dto.status === 'published' ? 'page.publish' : 'page.save',
      { type: 'page', id: key },
      `${dto.status === 'published' ? 'Published' : 'Saved a draft of'} the ${key} page`,
    );
    return page;
  }
}

/** The contact-form inbox. */
@ApiTags('Admin - Inbox')
@ApiBearerAuth()
@OrganizationScoped()
@Controller('admin/organizations/:orgId/inquiries')
export class InquiriesController {
  constructor(private readonly content: ContentService) {}

  @Get()
  @RequirePermissions('inquiry.view')
  @ApiOkResponse({ type: InquiryPageResponse })
  list(@Tenant() tenant: TenantContext, @Query() query: InquiryListQueryDto) {
    return this.content.inquiries(tenant, query);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('inquiry.manage')
  @ApiOperation({ summary: 'Mark read / unread, or archive' })
  @ApiOkResponse({ type: InquiryResponse })
  update(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInquiryDto,
  ) {
    return this.content.updateInquiry(tenant, id, dto);
  }
}

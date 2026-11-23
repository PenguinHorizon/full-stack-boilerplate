import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityTarget, In, ObjectLiteral } from 'typeorm';
import {
  ContentStatus,
  DEFAULT_SECTION_ORDER,
  InquiryStatus,
  PageKey,
  SectionKey,
} from '@common/constants/website';
import { toPage } from '@common/pagination/page';
import { TenantContext } from '@common/tenancy/tenant-context';
import { escapeLike } from '@common/utils/sql';
import {
  AdminBannerResponse,
  AdminFaqResponse,
  AdminGalleryImageResponse,
  AdminPageResponse,
  AdminSectionResponse,
  AdminTestimonialResponse,
  InquiryPageResponse,
  InquiryResponse,
} from '@contracts/content.contracts';
import { MediaAsset } from '@database/entities/platform/media-asset.entity';
import {
  Banner,
  Faq,
  GalleryImage,
  SitePage,
  Testimonial,
  WebsiteSection,
} from '@database/entities/website/content.entity';
import { Inquiry } from '@database/entities/website/inquiry.entity';
import {
  assertIdsInOrganization,
  validationFailed,
} from '@common/tenancy/tenant-helpers';
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

const PAGE_TITLES: Record<PageKey, string> = {
  [PageKey.About]: 'About us',
  [PageKey.Privacy]: 'Privacy policy',
  [PageKey.Terms]: 'Terms of service',
};

/** Defined fields of a PATCH body only (an omitted field keeps its value). */
function defined<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/**
 * The website editors and the contact inbox. Items are
 * drafts until published; drafts show only in a staff preview of the site.
 * Images must come from the organization's own media library.
 */
@Injectable()
export class ContentService {
  constructor(private readonly dataSource: DataSource) {}

  private get manager() {
    return this.dataSource.manager;
  }

  /* ── Home sections ──────────────────────────────────────── */

  async sections(ctx: TenantContext): Promise<AdminSectionResponse[]> {
    const rows = await this.manager.find(WebsiteSection, {
      where: { organizationId: ctx.organizationId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    // Without rows the site shows every section in the default order.
    const ordered: SectionKey[] = [
      ...rows.map((row) => row.sectionKey),
      ...DEFAULT_SECTION_ORDER.filter(
        (key) => !rows.some((row) => row.sectionKey === key),
      ),
    ];
    return ordered.map((key, index) => {
      const row = rows.find((r) => r.sectionKey === key);
      const limit = row?.settings?.limit;
      return {
        key,
        isEnabled: row ? row.isEnabled : rows.length === 0,
        sortOrder: index,
        title: row?.title ?? null,
        subtitle: row?.subtitle ?? null,
        limit: typeof limit === 'number' ? limit : null,
      };
    });
  }

  async replaceSections(
    ctx: TenantContext,
    dto: SectionsInputDto,
  ): Promise<AdminSectionResponse[]> {
    const keys = dto.sections.map((section) => section.key);
    if (new Set(keys).size !== keys.length) {
      throw validationFailed([{ field: 'sections', message: 'Each section once' }]);
    }
    // Sections left out go to the end, switched off.
    const all = [
      ...dto.sections,
      ...DEFAULT_SECTION_ORDER.filter((key) => !keys.includes(key)).map((key) => ({
        key,
        isEnabled: false,
        title: undefined,
        subtitle: undefined,
        limit: undefined,
      })),
    ];
    await this.dataSource.transaction(async (manager) => {
      const existing = await manager.find(WebsiteSection, {
        where: { organizationId: ctx.organizationId },
      });
      for (const [index, section] of all.entries()) {
        const row =
          existing.find((r) => r.sectionKey === section.key) ??
          manager.create(WebsiteSection, {
            organizationId: ctx.organizationId,
            sectionKey: section.key,
          });
        row.isEnabled = section.isEnabled;
        row.sortOrder = index;
        if (section.title !== undefined) row.title = section.title;
        if (section.subtitle !== undefined) row.subtitle = section.subtitle;
        if (section.limit !== undefined) {
          row.settings = section.limit ? { limit: section.limit } : null;
        }
        row.updatedByUserId = ctx.userId;
        await manager.save(row);
      }
    });
    return this.sections(ctx);
  }

  /* ── Banners ─────────────────────────────────────────── */

  async banners(
    ctx: TenantContext,
    query: ContentListQueryDto,
  ): Promise<AdminBannerResponse[]> {
    const rows = await this.manager.find(Banner, {
      where: {
        organizationId: ctx.organizationId,
        ...(query.placement ? { placement: query.placement } : {}),
      },
      order: { placement: 'ASC', sortOrder: 'ASC', id: 'ASC' },
    });
    const media = await this.mediaMap(
      rows.flatMap((row) => [row.desktopMediaId, row.mobileMediaId]),
    );
    const now = Date.now();
    return rows.map((row) => ({
      id: row.id,
      placement: row.placement,
      internalName: row.internalName,
      headline: row.headline,
      subheadline: row.subheadline,
      ctaLabel: row.ctaLabel,
      ctaUrl: row.ctaUrl,
      desktopMediaId: row.desktopMediaId,
      desktopUrl: media.get(row.desktopMediaId) ?? '',
      mobileMediaId: row.mobileMediaId,
      mobileUrl: row.mobileMediaId ? (media.get(row.mobileMediaId) ?? null) : null,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      status: row.status,
      sortOrder: row.sortOrder,
      isLive:
        row.status === ContentStatus.Published &&
        (!row.startsAt || row.startsAt.getTime() <= now) &&
        (!row.endsAt || row.endsAt.getTime() > now),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async createBanner(ctx: TenantContext, dto: BannerInputDto): Promise<Banner> {
    const row = this.manager.create(Banner, {
      organizationId: ctx.organizationId,
      sortOrder: await this.nextOrder(Banner, ctx.organizationId),
    });
    return this.saveBanner(ctx, row, dto);
  }

  async updateBanner(
    ctx: TenantContext,
    id: number,
    dto: UpdateBannerDto,
  ): Promise<Banner> {
    return this.saveBanner(ctx, await this.owned(Banner, ctx, id, 'Banner'), dto);
  }

  private async saveBanner(
    ctx: TenantContext,
    row: Banner,
    dto: UpdateBannerDto,
  ): Promise<Banner> {
    const patch = defined(dto);
    const next = {
      ...row,
      ...patch,
      startsAt:
        patch.startsAt !== undefined
          ? patch.startsAt
            ? new Date(patch.startsAt)
            : null
          : (row.startsAt ?? null),
      endsAt:
        patch.endsAt !== undefined
          ? patch.endsAt
            ? new Date(patch.endsAt)
            : null
          : (row.endsAt ?? null),
    };
    if (next.startsAt && next.endsAt && next.endsAt <= next.startsAt) {
      throw validationFailed([{ field: 'endsAt', message: 'Must be after the start' }]);
    }
    await this.assertMedia(ctx, {
      desktopMediaId: patch.desktopMediaId,
      mobileMediaId: patch.mobileMediaId ?? undefined,
    });
    Object.assign(row, next);
    return this.manager.save(row);
  }

  /* ── Gallery ────────────────────────────────────────────── */

  async gallery(ctx: TenantContext): Promise<AdminGalleryImageResponse[]> {
    const rows = await this.manager.find(GalleryImage, {
      where: { organizationId: ctx.organizationId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const media = await this.mediaMap(rows.map((row) => row.mediaId));
    return rows.map((row) => ({
      id: row.id,
      mediaId: row.mediaId,
      url: media.get(row.mediaId) ?? '',
      caption: row.caption,
      tag: row.tag,
      status: row.status,
      sortOrder: row.sortOrder,
    }));
  }

  async createGallery(ctx: TenantContext, dto: GalleryInputDto): Promise<GalleryImage> {
    await this.assertMedia(ctx, { mediaId: dto.mediaId });
    return this.manager.save(
      this.manager.create(GalleryImage, {
        organizationId: ctx.organizationId,
        mediaId: dto.mediaId,
        caption: dto.caption ?? null,
        tag: dto.tag ?? null,
        status: dto.status,
        sortOrder: await this.nextOrder(GalleryImage, ctx.organizationId),
      }),
    );
  }

  async updateGallery(
    ctx: TenantContext,
    id: number,
    dto: UpdateGalleryDto,
  ): Promise<GalleryImage> {
    const row = await this.owned(GalleryImage, ctx, id, 'Photo');
    const patch = defined(dto);
    await this.assertMedia(ctx, { mediaId: patch.mediaId });
    Object.assign(row, patch);
    return this.manager.save(row);
  }

  /* ── Testimonials ───────────────────────────────────────── */

  async testimonials(ctx: TenantContext): Promise<AdminTestimonialResponse[]> {
    const rows = await this.manager.find(Testimonial, {
      where: { organizationId: ctx.organizationId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const media = await this.mediaMap(rows.map((row) => row.avatarMediaId));
    return rows.map((row) => ({
      id: row.id,
      authorName: row.authorName,
      authorDetail: row.authorDetail,
      quote: row.quote,
      rating: row.rating,
      source: row.source,
      avatarMediaId: row.avatarMediaId,
      avatarUrl: row.avatarMediaId ? (media.get(row.avatarMediaId) ?? null) : null,
      status: row.status,
      sortOrder: row.sortOrder,
    }));
  }

  async createTestimonial(
    ctx: TenantContext,
    dto: TestimonialInputDto,
  ): Promise<Testimonial> {
    await this.assertMedia(ctx, { avatarMediaId: dto.avatarMediaId ?? undefined });
    return this.manager.save(
      this.manager.create(Testimonial, {
        organizationId: ctx.organizationId,
        authorName: dto.authorName,
        authorDetail: dto.authorDetail ?? null,
        quote: dto.quote,
        rating: dto.rating ?? null,
        source: dto.source ?? null,
        avatarMediaId: dto.avatarMediaId ?? null,
        status: dto.status,
        sortOrder: await this.nextOrder(Testimonial, ctx.organizationId),
      }),
    );
  }

  async updateTestimonial(
    ctx: TenantContext,
    id: number,
    dto: UpdateTestimonialDto,
  ): Promise<Testimonial> {
    const row = await this.owned(Testimonial, ctx, id, 'Testimonial');
    const patch = defined(dto);
    await this.assertMedia(ctx, { avatarMediaId: patch.avatarMediaId ?? undefined });
    Object.assign(row, patch);
    return this.manager.save(row);
  }

  /* ── FAQs ───────────────────────────────────────────────── */

  async faqs(ctx: TenantContext): Promise<AdminFaqResponse[]> {
    const rows = await this.manager.find(Faq, {
      where: { organizationId: ctx.organizationId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      category: row.category,
      question: row.question,
      answer: row.answer,
      status: row.status,
      sortOrder: row.sortOrder,
    }));
  }

  async createFaq(ctx: TenantContext, dto: FaqInputDto): Promise<Faq> {
    return this.manager.save(
      this.manager.create(Faq, {
        organizationId: ctx.organizationId,
        ...dto,
        sortOrder: await this.nextOrder(Faq, ctx.organizationId),
      }),
    );
  }

  async updateFaq(ctx: TenantContext, id: number, dto: UpdateFaqDto): Promise<Faq> {
    const row = await this.owned(Faq, ctx, id, 'Question');
    Object.assign(row, defined(dto));
    return this.manager.save(row);
  }

  /* ── Shared: delete and order ────────────────────────────────────── */

  async remove<T extends ObjectLiteral & { id: number; organizationId: number }>(
    entity: EntityTarget<T>,
    ctx: TenantContext,
    id: number,
    label: string,
  ): Promise<T> {
    const row = await this.owned(entity, ctx, id, label);
    await this.manager.delete(entity, { id: row.id } as never);
    return row;
  }

  async reorder<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    ctx: TenantContext,
    dto: ReorderDto,
  ): Promise<void> {
    const ids = [...new Set(dto.items.map((item) => item.id))];
    await assertIdsInOrganization(
      this.manager,
      entity,
      ctx.organizationId,
      ids,
      'items',
      'items',
    );
    await this.dataSource.transaction(async (manager) => {
      for (const item of dto.items) {
        await manager.update(
          entity,
          { id: item.id, organizationId: ctx.organizationId } as never,
          {
            sortOrder: item.sortOrder,
          } as never,
        );
      }
    });
  }

  /* ── Pages ───────────────────────────────────────────── */

  async page(ctx: TenantContext, key: PageKey): Promise<AdminPageResponse> {
    const row = await this.manager.findOneBy(SitePage, {
      organizationId: ctx.organizationId,
      pageKey: key,
    });
    const media = await this.mediaMap([row?.heroMediaId ?? null]);
    return {
      key,
      exists: Boolean(row),
      title: row?.title ?? PAGE_TITLES[key],
      body: row?.body ?? '',
      heroMediaId: row?.heroMediaId ?? null,
      heroUrl: row?.heroMediaId ? (media.get(row.heroMediaId) ?? null) : null,
      status: row?.status ?? ContentStatus.Draft,
      publishedAt: row?.publishedAt?.toISOString() ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  }

  /** Publishing stamps the "last updated" date customers see. */
  async putPage(
    ctx: TenantContext,
    key: PageKey,
    dto: PageInputDto,
  ): Promise<AdminPageResponse> {
    await this.assertMedia(ctx, { heroMediaId: dto.heroMediaId ?? undefined });
    const row =
      (await this.manager.findOneBy(SitePage, {
        organizationId: ctx.organizationId,
        pageKey: key,
      })) ??
      this.manager.create(SitePage, {
        organizationId: ctx.organizationId,
        pageKey: key,
      });
    const publishing = dto.status === ContentStatus.Published;
    row.title = dto.title;
    row.body = dto.body.replace(/\r\n/g, '\n');
    row.heroMediaId = dto.heroMediaId ?? null;
    row.status = dto.status;
    row.updatedByUserId = ctx.userId;
    if (publishing) row.publishedAt = new Date();
    await this.manager.save(row);
    return this.page(ctx, key);
  }

  /* ── Inbox ──────────────────────────────────────────────── */

  async inquiries(
    ctx: TenantContext,
    query: InquiryListQueryDto,
  ): Promise<InquiryPageResponse> {
    const qb = this.manager
      .createQueryBuilder(Inquiry, 'i')
      .where('i.organizationId = :orgId', { orgId: ctx.organizationId });
    if (query.status) qb.andWhere('i.status = :status', { status: query.status });
    else qb.andWhere('i.status <> :archived', { archived: InquiryStatus.Archived });
    if (query.q) {
      const like = `%${escapeLike(query.q)}%`;
      qb.andWhere(
        '(i.name LIKE :like OR i.email LIKE :like OR i.phone LIKE :like OR i.subject LIKE :like OR i.message LIKE :like)',
        { like },
      );
    }
    const [rows, total, counts] = await Promise.all([
      qb
        .orderBy('i.createdAt', 'DESC')
        .addOrderBy('i.id', 'DESC')
        .skip((query.page - 1) * query.pageSize)
        .take(query.pageSize)
        .getMany(),
      qb.getCount(),
      this.manager
        .createQueryBuilder(Inquiry, 'i')
        .select('i.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('i.organizationId = :orgId', { orgId: ctx.organizationId })
        .groupBy('i.status')
        .getRawMany<{ status: InquiryStatus; count: string }>(),
    ]);
    const countOf = (status: InquiryStatus) =>
      Number(counts.find((row) => row.status === status)?.count ?? 0);
    return {
      ...toPage(rows.map(toInquiry), total, query),
      counts: {
        new: countOf(InquiryStatus.New),
        read: countOf(InquiryStatus.Read),
        archived: countOf(InquiryStatus.Archived),
      },
    };
  }

  async updateInquiry(
    ctx: TenantContext,
    id: number,
    dto: UpdateInquiryDto,
  ): Promise<InquiryResponse> {
    const row = await this.owned(Inquiry, ctx, id, 'Message');
    row.status = dto.status;
    await this.manager.save(row);
    return toInquiry(row);
  }

  /* ── Internals ───────────────────────────────────────────────────── */

  private async owned<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    ctx: TenantContext,
    id: number,
    label: string,
  ): Promise<T> {
    const row = await this.manager.findOneBy(entity, {
      id,
      organizationId: ctx.organizationId,
    } as never);
    if (!row) throw new NotFoundException(`${label} not found`);
    return row;
  }

  private async nextOrder<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    organizationId: number,
  ): Promise<number> {
    const raw = await this.manager
      .createQueryBuilder(entity, 'x')
      .select('COALESCE(MAX(x.sortOrder), -1) + 1', 'next')
      .where('x.organizationId = :organizationId', { organizationId })
      .getRawOne<{ next: string }>();
    return Number(raw?.next ?? 0);
  }

  /** Every given image id (null/undefined skipped) belongs to this organization. */
  private async assertMedia(
    ctx: TenantContext,
    fields: Record<string, number | null | undefined>,
  ): Promise<void> {
    for (const [field, id] of Object.entries(fields)) {
      if (id) {
        await assertIdsInOrganization(
          this.manager,
          MediaAsset,
          ctx.organizationId,
          [id],
          field,
          'an image from your media library',
        );
      }
    }
  }

  private async mediaMap(
    ids: Array<number | null | undefined>,
  ): Promise<Map<number, string>> {
    const unique = [...new Set(ids.filter((id): id is number => Boolean(id)))];
    if (unique.length === 0) return new Map();
    const rows = await this.manager.find(MediaAsset, {
      where: { id: In(unique) },
      select: { id: true, url: true },
    });
    return new Map(rows.map((row) => [row.id, row.url]));
  }
}

function toInquiry(row: Inquiry): InquiryResponse {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

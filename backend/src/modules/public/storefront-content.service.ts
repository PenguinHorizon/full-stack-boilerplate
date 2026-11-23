import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { ContentStatus, InquiryStatus, PageKey } from '@common/constants/website';
import { normalizePhone } from '@common/domain/phone';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';
import {
  FaqGroupResponse,
  GalleryItemResponse,
  GalleryResponse,
  PublicTestimonialResponse,
  SitePageResponse,
} from '@contracts/storefront.contracts';
import { MediaAsset } from '@database/entities/platform/media-asset.entity';
import {
  Faq,
  GalleryImage,
  SitePage,
  Testimonial,
} from '@database/entities/website/content.entity';
import { Inquiry } from '@database/entities/website/inquiry.entity';
import { PublicOrganizationRecord } from '@modules/organizations/organizations.mapper';
import { MailService } from '@modules/mail/mail.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CreateInquiryDto } from './storefront.dto';

export type NavigationPage = 'about' | 'gallery' | 'faqs' | 'privacy' | 'terms';

/** Published content, plus drafts in a staff preview. */
const statuses = (drafts: boolean) =>
  drafts ? [ContentStatus.Published, ContentStatus.Draft] : [ContentStatus.Published];
const visible = (drafts: boolean) => In(statuses(drafts));

/**
 * Published website content and the contact form. Drafts only leave the
 * server in a signed-in staff preview.
 */
@Injectable()
export class StorefrontContentService {
  private readonly logger = new Logger(StorefrontContentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Optional pages that have published content (or drafts, in preview). */
  async navigation(
    organization: PublicOrganizationRecord,
    drafts = false,
  ): Promise<NavigationPage[]> {
    const manager = this.dataSource.manager;
    const organizationId = organization.id;
    const published = visible(drafts);
    const [pages, galleryCount, faqCount] = await Promise.all([
      manager.find(SitePage, {
        where: { organizationId, status: published },
        select: { pageKey: true },
      }),
      manager.count(GalleryImage, { where: { organizationId, status: published } }),
      manager.count(Faq, { where: { organizationId, status: published } }),
    ]);
    const has = (key: PageKey) => pages.some((page) => page.pageKey === key);
    const result: NavigationPage[] = [];
    if (has(PageKey.About)) result.push('about');
    if (galleryCount > 0) result.push('gallery');
    if (faqCount > 0) result.push('faqs');
    if (has(PageKey.Privacy)) result.push('privacy');
    if (has(PageKey.Terms)) result.push('terms');
    return result;
  }

  async page(
    organizationId: number,
    key: PageKey,
    drafts = false,
  ): Promise<SitePageResponse> {
    const page = await this.dataSource.manager
      .createQueryBuilder(SitePage, 'p')
      .leftJoinAndMapOne('p.heroMedia', MediaAsset, 'm', 'm.id = p.heroMediaId')
      .where(
        'p.organizationId = :organizationId AND p.pageKey = :key AND p.status IN (:...statuses)',
        {
          organizationId,
          key,
          statuses: statuses(drafts),
        },
      )
      .getOne();
    if (!page) throw new NotFoundException('Page not found');
    return {
      key: page.pageKey,
      title: page.title,
      body: page.body,
      heroUrl: page.heroMedia?.url ?? null,
      updatedAt: (page.publishedAt ?? page.updatedAt).toISOString(),
    };
  }

  async faqs(organizationId: number, drafts = false): Promise<FaqGroupResponse[]> {
    const rows = await this.dataSource.manager.find(Faq, {
      where: { organizationId, status: visible(drafts) },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const groups: FaqGroupResponse[] = [];
    for (const row of rows) {
      const item = { id: row.id, question: row.question, answer: row.answer };
      const group = groups.find((g) => g.category === row.category);
      if (group) group.items.push(item);
      else groups.push({ category: row.category, items: [item] });
    }
    return groups;
  }

  async gallery(
    organizationId: number,
    tag?: string | null,
    limit?: number,
    drafts = false,
  ): Promise<GalleryResponse> {
    const rows = await this.dataSource.manager
      .createQueryBuilder(GalleryImage, 'g')
      .innerJoinAndMapOne('g.media', MediaAsset, 'm', 'm.id = g.mediaId')
      .where('g.organizationId = :organizationId AND g.status IN (:...statuses)', {
        organizationId,
        statuses: statuses(drafts),
      })
      .orderBy('g.sortOrder', 'ASC')
      .addOrderBy('g.id', 'ASC')
      .getMany();
    const tags = [
      ...new Set(rows.map((row) => row.tag).filter((t): t is string => Boolean(t))),
    ];
    const items: GalleryItemResponse[] = rows
      .filter((row) => !tag || row.tag === tag)
      .slice(0, limit)
      .map((row) => {
        const media = (row as GalleryImage & { media: MediaAsset }).media;
        return {
          id: row.id,
          url: media.url,
          alt: media.altText ?? row.caption,
          caption: row.caption,
          tag: row.tag,
          width: media.width,
          height: media.height,
        };
      });
    return { tags, items };
  }

  async testimonials(
    organizationId: number,
    limit?: number,
    drafts = false,
  ): Promise<PublicTestimonialResponse[]> {
    const rows = await this.dataSource.manager
      .createQueryBuilder(Testimonial, 't')
      .leftJoinAndMapOne('t.avatar', MediaAsset, 'm', 'm.id = t.avatarMediaId')
      .where('t.organizationId = :organizationId AND t.status IN (:...statuses)', {
        organizationId,
        statuses: statuses(drafts),
      })
      .orderBy('t.sortOrder', 'ASC')
      .addOrderBy('t.id', 'ASC')
      .take(limit)
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      authorName: row.authorName,
      authorDetail: row.authorDetail,
      quote: row.quote,
      rating: row.rating,
      source: row.source,
      avatarUrl: row.avatar?.url ?? null,
    }));
  }

  /** Store the message, notify staff, then email the business (never blocks the reply). */
  async createInquiry(
    organization: PublicOrganizationRecord,
    dto: CreateInquiryDto,
    meta: { ip: string | null; userAgent: string | null },
  ): Promise<void> {
    // Honeypot filled: answer as usual, store nothing.
    if (dto.website) return;

    const errors: Array<{ field: string; message: string }> = [];
    let phone: string | null = null;
    if (dto.phone) {
      phone = normalizePhone(dto.phone, organization.countryCode);
      if (!phone)
        errors.push({ field: 'phone', message: 'Enter a valid phone number' });
    }
    if (!dto.phone && !dto.email) {
      errors.push({
        field: 'email',
        message: 'Leave a phone number or an email so we can reply',
      });
    }
    if (errors.length) {
      throw new DomainException(
        ErrorCode.ValidationFailed,
        errors[0].message,
        HttpStatus.BAD_REQUEST,
        undefined,
        errors,
      );
    }

    const inquiry = await this.dataSource.manager.save(
      this.dataSource.manager.create(Inquiry, {
        organizationId: organization.id,
        name: dto.name,
        phone,
        email: dto.email ?? null,
        subject: dto.subject ?? null,
        message: dto.message,
        status: InquiryStatus.New,
        ipAddress: meta.ip?.slice(0, 45) ?? null,
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
      }),
    );

    // Awaited so staff see it on their next poll; a failure never fails the visitor's message.
    await this.notifications
      .notifyPermitted(organization.id, 'inquiry.view', {
        type: 'inquiry.received',
        title: `New message from ${inquiry.name}`,
        body: inquiry.subject ?? inquiry.message.slice(0, 140),
        data: { inquiryId: inquiry.id },
      })
      .catch((error) =>
        this.logger.error(`Inquiry notification failed: ${String(error)}`),
      );

    const to = organization.contactEmail;
    if (!to) {
      this.logger.log(
        `Inquiry ${inquiry.id} for "${organization.slug}" stored; no contact email set.`,
      );
      return;
    }
    const lines = [
      `New message from your website (${organization.name}).`,
      '',
      `Name: ${inquiry.name}`,
      inquiry.phone ? `Phone: ${inquiry.phone}` : null,
      inquiry.email ? `Email: ${inquiry.email}` : null,
      inquiry.subject ? `Subject: ${inquiry.subject}` : null,
      '',
      inquiry.message,
    ].filter((line): line is string => line !== null);
    void this.mail.send({
      to,
      subject: `Website message${inquiry.subject ? `: ${inquiry.subject}` : ` from ${inquiry.name}`}`,
      text: lines.join('\n'),
    });
  }
}

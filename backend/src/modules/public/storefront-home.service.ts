import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  BannerPlacement,
  ContentStatus,
  DEFAULT_SECTION_ORDER,
  SectionKey,
} from '@common/constants/website';
import {
  HomeResponse,
  HomeSectionResponse,
  HomeSlideResponse,
} from '@contracts/storefront.contracts';
import { MediaAsset } from '@database/entities/platform/media-asset.entity';
import { Banner, WebsiteSection } from '@database/entities/website/content.entity';
import { PublicOrganizationRecord } from '@modules/organizations/organizations.mapper';
import { StorefrontContentService } from './storefront-content.service';

interface SectionConfig {
  key: SectionKey;
  title: string | null;
  subtitle: string | null;
  settings: Record<string, unknown> | null;
}

const empty = (key: SectionKey, config: SectionConfig): HomeSectionResponse => ({
  key,
  title: config.title,
  subtitle: config.subtitle,
  slides: null,
  body: null,
  testimonials: null,
  gallery: null,
  faqs: null,
});

/** A whole number from a section's settings, within bounds, else the default. */
function limitFrom(
  settings: Record<string, unknown> | null,
  fallback: number,
  max = 24,
) {
  const value = settings?.limit;
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? Math.min(value, max)
    : fallback;
}

/**
 * The home page: enabled sections in their order, each filled from live
 * data. An organization without section rows gets every section in the default
 * order. Sections with nothing to show are left out.
 *
 * Adding a domain section (e.g. featured tours): add its key to SectionKey,
 * a nullable field to HomeSectionResponse, and a case below.
 */
@Injectable()
export class StorefrontHomeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly content: StorefrontContentService,
  ) {}

  /** `drafts`: a staff preview also shows draft slides, testimonials and photos. */
  async home(
    organization: PublicOrganizationRecord,
    drafts = false,
  ): Promise<HomeResponse> {
    const configs = await this.sections(organization.id);
    const now = new Date();

    const sections: HomeSectionResponse[] = [];
    for (const config of configs) {
      const section = empty(config.key, config);
      switch (config.key) {
        case SectionKey.Hero:
          section.slides = await this.banners(
            organization.id,
            BannerPlacement.Hero,
            now,
            drafts,
          );
          break;
        case SectionKey.Intro:
          if (!organization.description) continue;
          section.body = organization.description;
          break;
        case SectionKey.Gallery: {
          const gallery = await this.content.gallery(
            organization.id,
            null,
            limitFrom(config.settings, 8),
            drafts,
          );
          if (gallery.items.length === 0) continue;
          section.gallery = gallery.items;
          break;
        }
        case SectionKey.Testimonials: {
          const testimonials = await this.content.testimonials(
            organization.id,
            limitFrom(config.settings, 6),
            drafts,
          );
          if (testimonials.length === 0) continue;
          section.testimonials = testimonials;
          break;
        }
        case SectionKey.Faqs: {
          const faqs = await this.content.faqs(organization.id, drafts);
          if (faqs.length === 0) continue;
          section.faqs = faqs;
          break;
        }
        case SectionKey.Contact:
          if (
            !organization.contactPhone &&
            !organization.contactEmail &&
            !organization.addressLine
          )
            continue;
          break;
      }
      sections.push(section);
    }
    return {
      sections,
      banners: await this.banners(organization.id, BannerPlacement.Home, now, drafts),
    };
  }

  /** Section rows in order; every section, in the default order, when there are none. */
  private async sections(organizationId: number): Promise<SectionConfig[]> {
    const rows = await this.dataSource.manager.find(WebsiteSection, {
      where: { organizationId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    if (rows.length === 0) {
      return DEFAULT_SECTION_ORDER.map((key) => ({
        key,
        title: null,
        subtitle: null,
        settings: null,
      }));
    }
    return rows
      .filter((row) => row.isEnabled)
      .map((row) => ({
        key: row.sectionKey,
        title: row.title,
        subtitle: row.subtitle,
        settings: row.settings,
      }));
  }

  /** Banners for one placement that are live now, in their order. */
  async banners(
    organizationId: number,
    placement: BannerPlacement,
    now = new Date(),
    drafts = false,
  ): Promise<HomeSlideResponse[]> {
    const banners = await this.dataSource.manager
      .createQueryBuilder(Banner, 'b')
      .innerJoinAndMapOne('b.desktopMedia', MediaAsset, 'd', 'd.id = b.desktopMediaId')
      .leftJoinAndMapOne('b.mobileMedia', MediaAsset, 'mm', 'mm.id = b.mobileMediaId')
      .where('b.organizationId = :organizationId', { organizationId })
      .andWhere('b.placement = :placement AND b.status IN (:...statuses)', {
        placement,
        statuses: drafts
          ? [ContentStatus.Published, ContentStatus.Draft]
          : [ContentStatus.Published],
      })
      .andWhere('(b.startsAt IS NULL OR b.startsAt <= :now)', { now })
      .andWhere('(b.endsAt IS NULL OR b.endsAt > :now)', { now })
      .orderBy('b.sortOrder', 'ASC')
      .addOrderBy('b.id', 'ASC')
      .getMany();
    return banners.map((banner) => ({
      headline: banner.headline,
      subheadline: banner.subheadline,
      ctaLabel: banner.ctaLabel,
      ctaUrl: banner.ctaUrl,
      imageUrl: banner.desktopMedia!.url,
      mobileImageUrl: banner.mobileMedia?.url ?? null,
    }));
  }
}

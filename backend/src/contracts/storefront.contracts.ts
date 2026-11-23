import { ApiProperty } from '@nestjs/swagger';
import { SectionKey } from '../common/constants/website';

/*
 * Public storefront payloads: website content and the home page.
 * Instants are ISO-8601 UTC.
 */

/* ── Content ───────────────────────────────────────────────────────── */

export class PublicTestimonialResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() authorName: string;
  @ApiProperty({ type: String, nullable: true }) authorDetail: string | null;
  @ApiProperty() quote: string;
  @ApiProperty({ type: 'integer', nullable: true }) rating: number | null;
  @ApiProperty({ type: String, nullable: true }) source: string | null;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
}

export class GalleryItemResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() url: string;
  @ApiProperty({ type: String, nullable: true }) alt: string | null;
  @ApiProperty({ type: String, nullable: true }) caption: string | null;
  @ApiProperty({ type: String, nullable: true }) tag: string | null;
  @ApiProperty({ type: 'integer', nullable: true }) width: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) height: number | null;
}

export class GalleryResponse {
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ type: () => [GalleryItemResponse] }) items: GalleryItemResponse[];
}

export class FaqItemResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() question: string;
  @ApiProperty() answer: string;
}

export class FaqGroupResponse {
  @ApiProperty() category: string;
  @ApiProperty({ type: () => [FaqItemResponse] }) items: FaqItemResponse[];
}

export class SitePageResponse {
  @ApiProperty({ enum: ['about', 'privacy', 'terms'] }) key: string;
  @ApiProperty() title: string;
  @ApiProperty({ description: 'Simple text format (ADR-020)' }) body: string;
  @ApiProperty({ type: String, nullable: true }) heroUrl: string | null;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

/* ── Home ──────────────────────────────────────────────────────────── */

export class HomeSlideResponse {
  @ApiProperty({ type: String, nullable: true }) headline: string | null;
  @ApiProperty({ type: String, nullable: true }) subheadline: string | null;
  @ApiProperty({ type: String, nullable: true }) ctaLabel: string | null;
  @ApiProperty({ type: String, nullable: true }) ctaUrl: string | null;
  @ApiProperty() imageUrl: string;
  @ApiProperty({ type: String, nullable: true }) mobileImageUrl: string | null;
}

/**
 * One home section. Only the field for its key is filled; the rest are null.
 * Sections without content are left out.
 */
export class HomeSectionResponse {
  @ApiProperty({ enum: SectionKey }) key: string;
  @ApiProperty({ type: String, nullable: true }) title: string | null;
  @ApiProperty({ type: String, nullable: true }) subtitle: string | null;
  @ApiProperty({ type: () => [HomeSlideResponse], nullable: true })
  slides: HomeSlideResponse[] | null;
  @ApiProperty({ type: String, nullable: true, description: 'Intro text' })
  body: string | null;
  @ApiProperty({ type: () => [PublicTestimonialResponse], nullable: true })
  testimonials: PublicTestimonialResponse[] | null;
  @ApiProperty({ type: () => [GalleryItemResponse], nullable: true })
  gallery: GalleryItemResponse[] | null;
  @ApiProperty({ type: () => [FaqGroupResponse], nullable: true })
  faqs: FaqGroupResponse[] | null;
}

export class HomeResponse {
  @ApiProperty({ type: () => [HomeSectionResponse] }) sections: HomeSectionResponse[];
  @ApiProperty({
    type: () => [HomeSlideResponse],
    description: 'Banners for the home page strip, live now',
  })
  banners: HomeSlideResponse[];
}

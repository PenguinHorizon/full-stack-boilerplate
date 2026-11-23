import { ApiProperty } from '@nestjs/swagger';
import {
  BannerPlacement,
  ContentStatus,
  InquiryStatus,
  PageKey,
  SectionKey,
} from '../common/constants/website';
import { PageMetaResponse } from './common.contracts';

/*
 * Website content and the inbox for staff. Draft items show only in a
 * preview.
 */

/** What a create or update answers: the item's id (the list is fetched again). */
export class CreatedIdResponse {
  @ApiProperty({ type: 'integer' }) id: number;
}

export class AdminSectionResponse {
  @ApiProperty({ enum: SectionKey, enumName: 'SectionKey' }) key: SectionKey;
  @ApiProperty() isEnabled: boolean;
  @ApiProperty({ type: 'integer' }) sortOrder: number;
  @ApiProperty({ type: String, nullable: true }) title: string | null;
  @ApiProperty({ type: String, nullable: true }) subtitle: string | null;
  @ApiProperty({ type: Number, nullable: true, description: 'How many items to show' })
  limit: number | null;
}

export class AdminBannerResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty({ enum: BannerPlacement, enumName: 'BannerPlacement' })
  placement: BannerPlacement;
  @ApiProperty() internalName: string;
  @ApiProperty({ type: String, nullable: true }) headline: string | null;
  @ApiProperty({ type: String, nullable: true }) subheadline: string | null;
  @ApiProperty({ type: String, nullable: true }) ctaLabel: string | null;
  @ApiProperty({ type: String, nullable: true }) ctaUrl: string | null;
  @ApiProperty({ type: 'integer' }) desktopMediaId: number;
  @ApiProperty() desktopUrl: string;
  @ApiProperty({ type: Number, nullable: true }) mobileMediaId: number | null;
  @ApiProperty({ type: String, nullable: true }) mobileUrl: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startsAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endsAt: string | null;
  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  status: ContentStatus;
  @ApiProperty({ type: 'integer' }) sortOrder: number;
  @ApiProperty({ description: 'Published and inside its dates now' }) isLive: boolean;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class AdminGalleryImageResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty({ type: 'integer' }) mediaId: number;
  @ApiProperty() url: string;
  @ApiProperty({ type: String, nullable: true }) caption: string | null;
  @ApiProperty({ type: String, nullable: true }) tag: string | null;
  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  status: ContentStatus;
  @ApiProperty({ type: 'integer' }) sortOrder: number;
}

export class AdminTestimonialResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() authorName: string;
  @ApiProperty({ type: String, nullable: true }) authorDetail: string | null;
  @ApiProperty() quote: string;
  @ApiProperty({ type: Number, nullable: true }) rating: number | null;
  @ApiProperty({ type: String, nullable: true }) source: string | null;
  @ApiProperty({ type: Number, nullable: true }) avatarMediaId: number | null;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  status: ContentStatus;
  @ApiProperty({ type: 'integer' }) sortOrder: number;
}

export class AdminFaqResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() category: string;
  @ApiProperty() question: string;
  @ApiProperty() answer: string;
  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  status: ContentStatus;
  @ApiProperty({ type: 'integer' }) sortOrder: number;
}

export class AdminPageResponse {
  @ApiProperty({ enum: PageKey, enumName: 'PageKey' }) key: PageKey;
  @ApiProperty({ description: 'False until it is first saved' }) exists: boolean;
  @ApiProperty() title: string;
  @ApiProperty({ description: 'Page text format (ADR-020)' }) body: string;
  @ApiProperty({ type: Number, nullable: true }) heroMediaId: number | null;
  @ApiProperty({ type: String, nullable: true }) heroUrl: string | null;
  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  status: ContentStatus;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  updatedAt: string | null;
}

/* ── Inbox ────────────────────────────────────────────────── */

export class InquiryResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ type: String, nullable: true }) email: string | null;
  @ApiProperty({ type: String, nullable: true }) subject: string | null;
  @ApiProperty() message: string;
  @ApiProperty({ enum: InquiryStatus, enumName: 'InquiryStatus' })
  status: InquiryStatus;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class InquiryCountsResponse {
  @ApiProperty({ type: 'integer' }) new: number;
  @ApiProperty({ type: 'integer' }) read: number;
  @ApiProperty({ type: 'integer' }) archived: number;
}

export class InquiryPageResponse {
  @ApiProperty({ type: () => [InquiryResponse] }) items: InquiryResponse[];
  @ApiProperty({ type: () => PageMetaResponse }) meta: PageMetaResponse;
  @ApiProperty({ type: () => InquiryCountsResponse }) counts: InquiryCountsResponse;
}

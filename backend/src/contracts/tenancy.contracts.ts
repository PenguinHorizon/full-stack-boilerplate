import { ApiProperty } from '@nestjs/swagger';
import { PageMetaResponse } from './common.contracts';
import { SocialLinksResponse } from './public.contracts';

/*
 * Organization profile, settings and media.
 * Money is a decimal string ("150.00", ADR-011); instants are ISO-8601 UTC;
 * dates are local "YYYY-MM-DD".
 */

const ORGANIZATION_STATUSES = ['draft', 'active', 'suspended', 'archived'];

/* ── Media ─────────────────────────────────────────────────────────── */

export class MediaAssetResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() url: string;
  @ApiProperty() mimeType: string;
  @ApiProperty({ type: 'integer' }) sizeBytes: number;
  @ApiProperty({ type: 'integer', nullable: true }) width: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) height: number | null;
  @ApiProperty({ type: String, nullable: true }) altText: string | null;
  @ApiProperty({ type: String, nullable: true }) originalName: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class MediaPageResponse {
  @ApiProperty({ type: [MediaAssetResponse] }) items: MediaAssetResponse[];
  @ApiProperty({ type: () => PageMetaResponse }) meta: PageMetaResponse;
}

/** An image referenced by another record (logo, cover …). */
export class MediaRefResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() url: string;
  @ApiProperty({ type: String, nullable: true }) altText: string | null;
  @ApiProperty({ type: 'integer', nullable: true }) width: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) height: number | null;
}

/* ── Organization profile & settings ─────────────────────────────────── */

export class OrganizationProfileResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ORGANIZATION_STATUSES }) status: string;
  @ApiProperty({ type: String, nullable: true }) tagline: string | null;
  @ApiProperty({ type: String, nullable: true }) shortDescription: string | null;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ type: () => MediaRefResponse, nullable: true })
  logo: MediaRefResponse | null;
  @ApiProperty({ type: () => MediaRefResponse, nullable: true })
  cover: MediaRefResponse | null;
  @ApiProperty({ type: () => MediaRefResponse, nullable: true })
  favicon: MediaRefResponse | null;
  @ApiProperty() brandPrimaryColor: string;
  @ApiProperty({ type: String, nullable: true }) brandAccentColor: string | null;
  @ApiProperty({ type: String, nullable: true }) contactPhone: string | null;
  @ApiProperty({ type: String, nullable: true }) contactEmail: string | null;
  @ApiProperty({ type: String, nullable: true }) websiteUrl: string | null;
  @ApiProperty({ type: String, nullable: true }) whatsappNumber: string | null;
  @ApiProperty({ type: String, nullable: true }) addressLine: string | null;
  @ApiProperty({ type: String, nullable: true }) city: string | null;
  @ApiProperty() countryCode: string;
  @ApiProperty({ type: () => SocialLinksResponse }) social: SocialLinksResponse;
  @ApiProperty() timezone: string;
  @ApiProperty() currencyCode: string;
  @ApiProperty() locale: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class OrganizationSettingsResponse {
  @ApiProperty() websiteEnabled: boolean;
  @ApiProperty() customerEmailsEnabled: boolean;
  @ApiProperty({ type: String, nullable: true }) seoTitle: string | null;
  @ApiProperty({ type: String, nullable: true }) seoDescription: string | null;
  @ApiProperty({ type: String, nullable: true }) analyticsMeasurementId: string | null;
  @ApiProperty({ type: String, nullable: true }) footerText: string | null;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

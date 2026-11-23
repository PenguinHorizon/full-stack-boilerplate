import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageMetaResponse } from './common.contracts';

/* Public storefront contracts: site resolution, bootstrap, directory. */

export class SiteResolveResponse {
  @ApiProperty({ example: 'northern-trails' }) organizationSlug: string;
  @ApiProperty({ example: '/', description: 'Router basename for this host' })
  basePath: string;
}

export class BrandResponse {
  @ApiProperty({ example: '#C8553D' }) primary: string;
  @ApiProperty({ type: String, nullable: true, example: '#E9B44C' })
  accent: string | null;
}

export class SocialLinksResponse {
  @ApiPropertyOptional({ type: String, nullable: true }) facebook?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) instagram?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) tiktok?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) x?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) youtube?: string | null;
}

export class ContactResponse {
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ type: String, nullable: true }) email: string | null;
  @ApiProperty({ type: String, nullable: true }) whatsapp: string | null;
  @ApiProperty({ type: String, nullable: true }) address: string | null;
  @ApiProperty({ type: String, nullable: true }) city: string | null;
}

export class PublicOrganizationResponse {
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) tagline: string | null;
  @ApiProperty({ type: String, nullable: true }) shortDescription: string | null;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ type: String, nullable: true }) logoUrl: string | null;
  @ApiProperty({ type: String, nullable: true }) coverUrl: string | null;
  @ApiProperty({ type: String, nullable: true }) faviconUrl: string | null;
  @ApiProperty({ type: () => BrandResponse }) brand: BrandResponse;
  @ApiProperty({ type: () => ContactResponse }) contact: ContactResponse;
  @ApiProperty({ type: () => SocialLinksResponse }) social: SocialLinksResponse;
  @ApiProperty({ example: 'PKR' }) currencyCode: string;
  @ApiProperty({ example: 'en-PK' }) locale: string;
  @ApiProperty({ example: 'Asia/Karachi' }) timezone: string;
  @ApiProperty({ example: 'PK' }) countryCode: string;
}

export class NavigationResponse {
  @ApiProperty({
    isArray: true,
    enum: ['about', 'gallery', 'faqs', 'privacy', 'terms'],
    description: 'Optional pages that have published content',
    example: ['about', 'faqs'],
  })
  pages: string[];
}

export class SeoResponse {
  @ApiProperty() title: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ type: String, nullable: true }) analyticsId: string | null;
}

export class SiteBootstrapResponse {
  @ApiProperty({ type: () => PublicOrganizationResponse })
  organization: PublicOrganizationResponse;
  @ApiProperty({ type: () => NavigationResponse }) navigation: NavigationResponse;
  @ApiProperty({ type: () => SeoResponse }) seo: SeoResponse;
  @ApiProperty({ type: String, nullable: true }) footerText: string | null;
}

export class OrganizationDirectoryItemResponse {
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) tagline: string | null;
  @ApiProperty({ type: String, nullable: true }) city: string | null;
  @ApiProperty({ type: String, nullable: true }) logoUrl: string | null;
  @ApiProperty({ type: String, nullable: true }) coverUrl: string | null;
  @ApiProperty({ type: () => BrandResponse }) brand: BrandResponse;
}

export class OrganizationDirectoryPageResponse {
  @ApiProperty({ type: () => [OrganizationDirectoryItemResponse] })
  items: OrganizationDirectoryItemResponse[];
  @ApiProperty({ type: () => PageMetaResponse }) meta: PageMetaResponse;
}

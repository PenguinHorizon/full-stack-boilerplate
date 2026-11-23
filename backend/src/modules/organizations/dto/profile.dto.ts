import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OptionalNotNull } from '@common/dto/optional';

/*
 * PATCH /admin/organizations/:orgId (profile, branding, contact, social, region)
 * and PATCH …/settings. Every field is optional; null clears a nullable one.
 * Phones, time zone, currency, locale and country are checked in the service.
 */

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() || null : value;

const HEX = /^#[0-9A-F]{6}$/;
const HEX_MESSAGE = 'use a colour like #C8553D';
const HTTPS_URL = { protocols: ['https'], require_protocol: true };

export class SocialLinksDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsUrl(HTTPS_URL, { message: 'use a full https:// link' })
  @MaxLength(255)
  facebook?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsUrl(HTTPS_URL, { message: 'use a full https:// link' })
  @MaxLength(255)
  instagram?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsUrl(HTTPS_URL, { message: 'use a full https:// link' })
  @MaxLength(255)
  tiktok?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsUrl(HTTPS_URL, { message: 'use a full https:// link' })
  @MaxLength(255)
  x?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsUrl(HTTPS_URL, { message: 'use a full https:// link' })
  @MaxLength(255)
  youtube?: string | null;
}

export class UpdateOrganizationProfileDto {
  @ApiPropertyOptional({ example: 'Northern Trails' })
  @OptionalNotNull()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(160)
  tagline?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(300)
  shortDescription?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  logoMediaId?: number | null;

  @ApiPropertyOptional({ type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  coverMediaId?: number | null;

  @ApiPropertyOptional({ type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  faviconMediaId?: number | null;

  @ApiPropertyOptional({ example: '#C8553D' })
  @OptionalNotNull()
  @Transform(upper)
  @IsString()
  @Matches(HEX, { message: HEX_MESSAGE })
  brandPrimaryColor?: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '#E9B44C' })
  @IsOptional()
  @Transform(upper)
  @Matches(HEX, { message: HEX_MESSAGE })
  brandAccentColor?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '021 3587 0000' })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(30)
  contactPhone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '0300 1234567' })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(30)
  whatsappNumber?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'use a full link starting with https://' },
  )
  @MaxLength(255)
  websiteUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(255)
  addressLine?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ type: () => SocialLinksDto })
  @OptionalNotNull()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  social?: SocialLinksDto;

  @ApiPropertyOptional({ example: 'PK' })
  @OptionalNotNull()
  @Transform(upper)
  @Matches(/^[A-Z]{2}$/, { message: 'use a two-letter country code such as PK' })
  countryCode?: string;

  @ApiPropertyOptional({ example: 'Asia/Karachi' })
  @OptionalNotNull()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'PKR' })
  @OptionalNotNull()
  @Transform(upper)
  @Matches(/^[A-Z]{3}$/, { message: 'use a three-letter currency code such as PKR' })
  currencyCode?: string;

  @ApiPropertyOptional({ example: 'en-PK' })
  @OptionalNotNull()
  @Transform(trim)
  @IsString()
  @MaxLength(10)
  locale?: string;
}

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional() @OptionalNotNull() @IsBoolean() websiteEnabled?: boolean;

  @ApiPropertyOptional()
  @OptionalNotNull()
  @IsBoolean()
  customerEmailsEnabled?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(70)
  seoTitle?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(160)
  seoDescription?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'G-ABC123XYZ' })
  @IsOptional()
  @Transform(upper)
  @Matches(/^G-[A-Z0-9]{4,20}$/, {
    message: 'use a Google Analytics ID like G-ABC123XYZ',
  })
  analyticsMeasurementId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(500)
  footerText?: string | null;
}

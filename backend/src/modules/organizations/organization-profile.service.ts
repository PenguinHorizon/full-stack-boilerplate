import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isSupportedCountry } from 'libphonenumber-js';
import { Repository } from 'typeorm';
import {
  SOCIAL_NETWORKS,
  SocialLinks,
  SocialNetwork,
} from '@common/constants/tenancy.enums';
import { isValidTimeZone } from '@common/domain/timezone';
import { normalizePhone } from '@common/domain/phone';
import { DomainException, FieldError } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';
import { TenantContext } from '@common/tenancy/tenant-context';
import { MediaAsset } from '@database/entities/platform/media-asset.entity';
import { Organization } from '@database/entities/tenancy/organization.entity';
import { OrganizationSettings } from '@database/entities/tenancy/organization-settings.entity';
import { MediaService } from '@modules/media/media.service';
import {
  SocialLinksDto,
  UpdateOrganizationProfileDto,
  UpdateOrganizationSettingsDto,
} from './dto/profile.dto';

/** Hosts accepted per network (subdomains such as www. or m. included). */
const SOCIAL_HOSTS: Record<SocialNetwork, string[]> = {
  facebook: ['facebook.com', 'fb.com'],
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  x: ['x.com', 'twitter.com'],
  youtube: ['youtube.com', 'youtu.be'],
};

/** ISO 4217 codes the runtime knows (Node ≥ 18; not yet in this TS lib). */
const CURRENCIES = new Set(
  (
    Intl as unknown as { supportedValuesOf(key: 'currency'): string[] }
  ).supportedValuesOf('currency'),
);

export interface MediaRef {
  id: number;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

/**
 * The organization's own profile and settings.
 * Slug and status stay with platform admins (onboarding, publishing).
 */
@Injectable()
export class OrganizationProfileService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(OrganizationSettings)
    private readonly settingsRepo: Repository<OrganizationSettings>,
    private readonly media: MediaService,
  ) {}

  async profile(organizationId: number) {
    const organization = await this.organizations.findOne({
      where: { id: organizationId },
      relations: { logo: true, cover: true, favicon: true },
    });
    if (!organization) throw new NotFoundException('Organization not found');
    return {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      status: organization.status,
      tagline: organization.tagline,
      shortDescription: organization.shortDescription,
      description: organization.description,
      logo: mediaRef(organization.logo),
      cover: mediaRef(organization.cover),
      favicon: mediaRef(organization.favicon),
      brandPrimaryColor: organization.brandPrimaryColor,
      brandAccentColor: organization.brandAccentColor,
      contactPhone: organization.contactPhone,
      contactEmail: organization.contactEmail,
      websiteUrl: organization.websiteUrl,
      whatsappNumber: organization.whatsappNumber,
      addressLine: organization.addressLine,
      city: organization.city,
      countryCode: organization.countryCode,
      social: { ...(organization.socialLinks ?? {}) },
      timezone: organization.timezone,
      currencyCode: organization.currencyCode,
      locale: organization.locale,
      updatedAt: organization.updatedAt,
    };
  }

  async updateProfile(ctx: TenantContext, dto: UpdateOrganizationProfileDto) {
    const organization = await this.organizations.findOneBy({ id: ctx.organizationId });
    if (!organization) throw new NotFoundException('Organization not found');
    const errors: FieldError[] = [];

    await this.media.assertOwned(ctx.organizationId, [
      { field: 'logoMediaId', id: dto.logoMediaId },
      { field: 'coverMediaId', id: dto.coverMediaId },
      { field: 'faviconMediaId', id: dto.faviconMediaId },
    ]);

    // Region first: phone numbers are read in the (new) country.
    if (dto.countryCode !== undefined) {
      if (isSupportedCountry(dto.countryCode))
        organization.countryCode = dto.countryCode;
      else errors.push({ field: 'countryCode', message: 'Unknown country code' });
    }
    if (dto.timezone !== undefined) {
      if (isValidTimeZone(dto.timezone)) organization.timezone = dto.timezone;
      else errors.push({ field: 'timezone', message: 'Unknown time zone' });
    }
    if (dto.currencyCode !== undefined) {
      if (CURRENCIES.has(dto.currencyCode))
        organization.currencyCode = dto.currencyCode;
      else errors.push({ field: 'currencyCode', message: 'Unknown currency' });
    }
    if (dto.locale !== undefined) {
      const locale = canonicalLocale(dto.locale);
      if (locale) organization.locale = locale;
      else errors.push({ field: 'locale', message: 'Unknown language and region' });
    }

    for (const field of ['contactPhone', 'whatsappNumber'] as const) {
      const value = dto[field];
      if (value === undefined) continue;
      if (value === null) {
        organization[field] = null;
        continue;
      }
      const phone = normalizePhone(value, organization.countryCode);
      if (phone) organization[field] = phone;
      else errors.push({ field, message: 'Enter a valid phone number' });
    }

    if (dto.social !== undefined) {
      const { links, errors: socialErrors } = mergeSocial(
        organization.socialLinks,
        dto.social,
      );
      organization.socialLinks = links;
      errors.push(...socialErrors);
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

    if (dto.name !== undefined) organization.name = dto.name;
    if (dto.tagline !== undefined) organization.tagline = dto.tagline;
    if (dto.shortDescription !== undefined)
      organization.shortDescription = dto.shortDescription;
    if (dto.description !== undefined) organization.description = dto.description;
    if (dto.logoMediaId !== undefined) organization.logoMediaId = dto.logoMediaId;
    if (dto.coverMediaId !== undefined) organization.coverMediaId = dto.coverMediaId;
    if (dto.faviconMediaId !== undefined)
      organization.faviconMediaId = dto.faviconMediaId;
    if (dto.brandPrimaryColor !== undefined)
      organization.brandPrimaryColor = dto.brandPrimaryColor;
    if (dto.brandAccentColor !== undefined)
      organization.brandAccentColor = dto.brandAccentColor;
    if (dto.contactEmail !== undefined) organization.contactEmail = dto.contactEmail;
    if (dto.websiteUrl !== undefined) organization.websiteUrl = dto.websiteUrl;
    if (dto.addressLine !== undefined) organization.addressLine = dto.addressLine;
    if (dto.city !== undefined) organization.city = dto.city;

    await this.organizations.save(organization);
    return this.profile(ctx.organizationId);
  }

  async settings(organizationId: number) {
    const settings = await this.settingsRepo.findOneBy({ organizationId });
    if (!settings) throw new NotFoundException('Organization settings not found');
    return toSettingsRow(settings);
  }

  async updateSettings(ctx: TenantContext, dto: UpdateOrganizationSettingsDto) {
    const settings = await this.settingsRepo.findOneBy({
      organizationId: ctx.organizationId,
    });
    if (!settings) throw new NotFoundException('Organization settings not found');

    if (dto.websiteEnabled !== undefined) settings.websiteEnabled = dto.websiteEnabled;
    if (dto.customerEmailsEnabled !== undefined) {
      settings.customerEmailsEnabled = dto.customerEmailsEnabled;
    }
    if (dto.seoTitle !== undefined) settings.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) settings.seoDescription = dto.seoDescription;
    if (dto.analyticsMeasurementId !== undefined) {
      settings.analyticsMeasurementId = dto.analyticsMeasurementId;
    }
    if (dto.footerText !== undefined) settings.footerText = dto.footerText;

    settings.updatedByUserId = ctx.userId;
    return toSettingsRow(await this.settingsRepo.save(settings));
  }
}

function mediaRef(asset: MediaAsset | null | undefined): MediaRef | null {
  return asset
    ? {
        id: asset.id,
        url: asset.url,
        altText: asset.altText,
        width: asset.width,
        height: asset.height,
      }
    : null;
}

function toSettingsRow(settings: OrganizationSettings) {
  return {
    websiteEnabled: settings.websiteEnabled,
    customerEmailsEnabled: settings.customerEmailsEnabled,
    seoTitle: settings.seoTitle,
    seoDescription: settings.seoDescription,
    analyticsMeasurementId: settings.analyticsMeasurementId,
    footerText: settings.footerText,
    updatedAt: settings.updatedAt,
  };
}

/** Applies a partial social update; each link must point at its own network. */
export function mergeSocial(
  current: SocialLinks | null,
  update: SocialLinksDto,
): { links: SocialLinks | null; errors: FieldError[] } {
  const links: SocialLinks = { ...(current ?? {}) };
  const errors: FieldError[] = [];
  for (const network of SOCIAL_NETWORKS) {
    const value = update[network];
    if (value === undefined) continue;
    if (value === null) {
      delete links[network];
      continue;
    }
    const host = new URL(value).hostname.toLowerCase();
    const allowed = SOCIAL_HOSTS[network].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    if (allowed) links[network] = value;
    else errors.push({ field: `social.${network}`, message: `Use a ${network} link` });
  }
  return { links: Object.keys(links).length ? links : null, errors };
}

function canonicalLocale(value: string): string | null {
  try {
    const [locale] = Intl.getCanonicalLocales(value);
    return locale && locale.length <= 10 ? locale : null;
  } catch {
    return null;
  }
}

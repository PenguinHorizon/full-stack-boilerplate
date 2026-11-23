import {
  PublicOrganizationResponse,
  OrganizationDirectoryItemResponse,
  SiteBootstrapResponse,
  SocialLinksResponse,
} from '@contracts/public.contracts';
import { SOCIAL_NETWORKS } from '@common/constants/tenancy.enums';
import { Organization } from '@database/entities/tenancy/organization.entity';
import { OrganizationSettings } from '@database/entities/tenancy/organization-settings.entity';

export type PublicOrganizationRecord = Organization & {
  settings: OrganizationSettings;
};

/*
 * Explicit field-by-field mapping: public responses are never raw entities
 * so internal columns such as
 * created_by or admin-only settings cannot leak by accident.
 */

function socialLinks(organization: Organization): SocialLinksResponse {
  const links = organization.socialLinks ?? {};
  const result: SocialLinksResponse = {};
  for (const network of SOCIAL_NETWORKS) {
    const url = links[network];
    if (typeof url === 'string' && url.startsWith('https://')) result[network] = url;
  }
  return result;
}

export function toPublicOrganization(
  organization: Organization,
): PublicOrganizationResponse {
  return {
    slug: organization.slug,
    name: organization.name,
    tagline: organization.tagline,
    shortDescription: organization.shortDescription,
    description: organization.description,
    logoUrl: organization.logo?.url ?? null,
    coverUrl: organization.cover?.url ?? null,
    faviconUrl: organization.favicon?.url ?? null,
    brand: {
      primary: organization.brandPrimaryColor,
      accent: organization.brandAccentColor,
    },
    contact: {
      phone: organization.contactPhone,
      email: organization.contactEmail,
      whatsapp: organization.whatsappNumber,
      address: organization.addressLine,
      city: organization.city,
    },
    social: socialLinks(organization),
    currencyCode: organization.currencyCode,
    locale: organization.locale,
    timezone: organization.timezone,
    countryCode: organization.countryCode,
  };
}

export function toSiteBootstrap(
  record: PublicOrganizationRecord,
  pages: string[] = [],
): SiteBootstrapResponse {
  const { settings } = record;
  const defaultTitle = record.tagline
    ? `${record.name} — ${record.tagline}`
    : record.name;
  return {
    organization: toPublicOrganization(record),
    navigation: { pages },
    seo: {
      title: settings.seoTitle ?? defaultTitle,
      description: settings.seoDescription ?? record.shortDescription,
      analyticsId: settings.analyticsMeasurementId,
    },
    footerText: settings.footerText,
  };
}

export function toDirectoryItem(
  record: PublicOrganizationRecord,
): OrganizationDirectoryItemResponse {
  return {
    slug: record.slug,
    name: record.name,
    tagline: record.tagline,
    city: record.city,
    logoUrl: record.logo?.url ?? null,
    coverUrl: record.cover?.url ?? null,
    brand: { primary: record.brandPrimaryColor, accent: record.brandAccentColor },
  };
}

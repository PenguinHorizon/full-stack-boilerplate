import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationsService } from '@modules/organizations/organizations.service';
import { normalizeHost } from '@modules/organizations/site-host';
import { StorefrontContentService } from './storefront-content.service';

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Per-host `sitemap.xml` and `robots.txt`. An organization host lists
 * its own public pages; the platform host lists the directory and each
 * organization's site. Unknown hosts get an empty sitemap and a robots file
 * that allows nothing to be indexed.
 */
@Injectable()
export class StorefrontSeoService {
  constructor(
    private readonly config: ConfigService,
    private readonly organizations: OrganizationsService,
    private readonly content: StorefrontContentService,
  ) {}

  private isPlatform(host: string): boolean {
    const platform = (
      this.config.get<string>('PLATFORM_DOMAIN') ?? 'localhost'
    ).toLowerCase();
    return host === platform || host === `www.${platform}`;
  }

  /** Paths (not URLs) for a sitemap, or null for an unknown host. */
  async paths(rawHost: string): Promise<string[] | null> {
    const host = normalizeHost(rawHost);
    if (!host) return null;

    if (this.isPlatform(host)) {
      const page = await this.organizations.listPublic({ page: 1, pageSize: 100 });
      return ['/', ...page.items.map((item) => `/s/${item.slug}`)];
    }

    let slug: string;
    try {
      slug = (await this.organizations.resolveHost(host)).organizationSlug;
    } catch {
      return null;
    }
    const organization = await this.organizations.findPublicBySlug(slug);
    const navigation = await this.content.navigation(organization);
    return ['/', '/contact', ...navigation.map((page) => `/${page}`)];
  }

  async sitemap(rawHost: string, protocol: string): Promise<string> {
    const host = normalizeHost(rawHost);
    const paths = (await this.paths(rawHost)) ?? [];
    const origin = `${protocol}://${host ?? 'localhost'}${this.portOf(rawHost)}`;
    const urls = paths
      .map((path) => `  <url><loc>${escapeXml(origin + path)}</loc></url>`)
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  }

  async robots(rawHost: string, protocol: string): Promise<string> {
    const paths = await this.paths(rawHost);
    if (!paths) return 'User-agent: *\nDisallow: /\n';
    const origin = `${protocol}://${normalizeHost(rawHost)}${this.portOf(rawHost)}`;
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
      '',
    ].join('\n');
  }

  /** Keeps a non-default port (local development), drops :80 and :443. */
  private portOf(rawHost: string): string {
    const port = /:(\d{1,5})$/.exec(rawHost.trim())?.[1];
    return port && port !== '80' && port !== '443' ? `:${port}` : '';
  }
}

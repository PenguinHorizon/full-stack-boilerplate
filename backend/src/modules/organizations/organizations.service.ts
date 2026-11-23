import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { OrganizationStatus } from '@common/constants/tenancy.enums';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';
import { Page, pageWindow, toPage } from '@common/pagination/page';
import { escapeLike } from '@common/utils/sql';
import { Organization } from '@database/entities/tenancy/organization.entity';
import { OrganizationDomain } from '@database/entities/tenancy/organization-domain.entity';
import { OrganizationSettings } from '@database/entities/tenancy/organization-settings.entity';
import {
  OrganizationDirectoryItemResponse,
  SiteBootstrapResponse,
  SiteResolveResponse,
} from '@contracts/public.contracts';
import { DirectoryQueryDto } from './dto/directory-query.dto';
import {
  PublicOrganizationRecord,
  toDirectoryItem,
  toSiteBootstrap,
} from './organizations.mapper';
import { isValidSlug, normalizeHost, slugFromPlatformSubdomain } from './site-host';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(OrganizationDomain)
    private readonly domains: Repository<OrganizationDomain>,
    private readonly config: ConfigService,
  ) {}

  /** Platform directory: active organizations whose website is switched on. */
  async listPublic(
    query: DirectoryQueryDto,
  ): Promise<Page<OrganizationDirectoryItemResponse>> {
    const qb = this.publicQuery().orderBy('r.name', 'ASC');

    if (query.q) {
      qb.andWhere('(r.name LIKE :term OR r.tagline LIKE :term)', {
        term: `%${escapeLike(query.q)}%`,
      });
    }
    if (query.city) {
      qb.andWhere('r.city = :city', { city: query.city });
    }

    const { skip, take } = pageWindow(query);
    const [records, total] = await qb.skip(skip).take(take).getManyAndCount();
    return toPage(
      (records as PublicOrganizationRecord[]).map(toDirectoryItem),
      total,
      query,
    );
  }

  /**
   * Storefront bootstrap for one organization (404 unless publicly available).
   * `navigation` lists the optional pages with published content.
   */
  async getSiteBootstrap(
    slug: string,
    navigation: (
      record: PublicOrganizationRecord,
    ) => Promise<string[]> = async () => [],
  ): Promise<SiteBootstrapResponse> {
    const record = await this.findPublicBySlug(slug);
    return toSiteBootstrap(record, await navigation(record));
  }

  /**
   * Host → organization (ADR-003): a custom domain row wins, otherwise a
   * `{slug}.PLATFORM_DOMAIN` subdomain. Unknown or unavailable → 404.
   */
  async resolveHost(rawHost: string): Promise<SiteResolveResponse> {
    const host = normalizeHost(rawHost);
    if (!host) throw this.unavailable();

    const domain = await this.domains.findOne({
      where: { hostname: host },
      relations: { organization: true },
    });
    const slug =
      domain?.organization?.slug ??
      slugFromPlatformSubdomain(
        host,
        this.config.get<string>('PLATFORM_DOMAIN') ?? 'localhost',
      );
    if (!slug) throw this.unavailable();

    const organization = await this.findPublicBySlug(slug);
    return { organizationSlug: organization.slug, basePath: '/' };
  }

  /**
   * May the edge get a TLS certificate for this host (Caddy on-demand TLS)?
   * The platform domain, a subdomain of an organization that exists, or a custom
   * domain an operator has marked verified — never an arbitrary name that
   * someone points at the platform (certificate authorities rate-limit us).
   */
  async isServedHost(rawHost: string): Promise<boolean> {
    const host = normalizeHost(rawHost);
    if (!host) return false;
    const platform = (
      this.config.get<string>('PLATFORM_DOMAIN') ?? 'localhost'
    ).toLowerCase();
    if (host === platform) return true;
    if (
      await this.domains.exists({
        where: { hostname: host, verifiedAt: Not(IsNull()) },
      })
    ) {
      return true;
    }
    const slug = slugFromPlatformSubdomain(host, platform);
    return Boolean(
      slug &&
      isValidSlug(slug) &&
      (await this.organizations.exists({ where: { slug } })),
    );
  }

  /**
   * The storefront's origin for links in emails (password reset, …).
   * The browser's `Origin` is used when it really is this organization's site
   * (its platform subdomain or one of its domains); otherwise the platform
   * subdomain, with APP_URL's scheme and port.
   */
  async storefrontOrigin(
    organization: Pick<Organization, 'id' | 'slug'>,
    requestOrigin?: string | null,
  ): Promise<string> {
    const platform = (
      this.config.get<string>('PLATFORM_DOMAIN') ?? 'localhost'
    ).toLowerCase();
    const subdomain = `${organization.slug}.${platform}`;
    if (requestOrigin) {
      try {
        const url = new URL(requestOrigin);
        const host = normalizeHost(url.host);
        if (
          host &&
          (host === subdomain ||
            (await this.domains.exists({
              where: { hostname: host, organizationId: organization.id },
            })))
        ) {
          return url.origin;
        }
      } catch {
        // Not a URL: fall back below.
      }
    }
    const app = new URL(this.config.get<string>('APP_URL') ?? 'http://localhost:5173');
    return `${app.protocol}//${subdomain}${app.port ? `:${app.port}` : ''}`;
  }

  async findPublicBySlug(slug: string): Promise<PublicOrganizationRecord> {
    if (!isValidSlug(slug)) throw this.unavailable();
    const record = await this.publicQuery()
      .andWhere('r.slug = :slug', { slug })
      .getOne();
    if (!record) throw this.unavailable();
    return record as PublicOrganizationRecord;
  }

  /** An organization with its settings, whatever its status (staff-side emails). */
  async findRecordById(id: number): Promise<PublicOrganizationRecord | null> {
    const record = await this.organizations
      .createQueryBuilder('r')
      .innerJoinAndMapOne(
        'r.settings',
        OrganizationSettings,
        's',
        's.organizationId = r.id',
      )
      .where('r.id = :id', { id })
      .getOne();
    return (record as PublicOrganizationRecord | null) ?? null;
  }

  /** Active, not soft-deleted (TypeORM default), website enabled, with media joined. */
  private publicQuery(): SelectQueryBuilder<Organization> {
    return this.organizations
      .createQueryBuilder('r')
      .innerJoinAndMapOne(
        'r.settings',
        OrganizationSettings,
        's',
        's.organizationId = r.id AND s.websiteEnabled = :websiteEnabled',
        { websiteEnabled: true },
      )
      .leftJoinAndSelect('r.logo', 'logo')
      .leftJoinAndSelect('r.cover', 'cover')
      .leftJoinAndSelect('r.favicon', 'favicon')
      .where('r.status = :status', { status: OrganizationStatus.Active });
  }

  /** Same response for unknown, draft, suspended and website-disabled organizations. */
  private unavailable() {
    return new DomainException(
      ErrorCode.OrganizationUnavailable,
      'This organization website is not available.',
      HttpStatus.NOT_FOUND,
    );
  }
}

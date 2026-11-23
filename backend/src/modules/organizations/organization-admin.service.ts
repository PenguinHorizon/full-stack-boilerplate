import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { OrganizationRole, OrganizationStatus } from '@common/constants/tenancy.enums';
import {
  CreateOrganizationDto,
  UpdatePlatformOrganizationDto,
} from '@common/dto/users.dto';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';
import { Page, pageWindow, resolveSort, toPage } from '@common/pagination/page';
import { escapeLike } from '@common/utils/sql';
import { OrganizationUser } from '@database/entities/identity/organization-user.entity';
import { Organization } from '@database/entities/tenancy/organization.entity';
import { OrganizationSettings } from '@database/entities/tenancy/organization-settings.entity';
import { UsersService } from '@modules/users/users.service';

export interface OrganizationAdminSummary {
  id: number;
  slug: string;
  name: string;
  status: OrganizationStatus;
  logoUrl: string | null;
  brandPrimaryColor: string;
  timezone: string;
  currencyCode: string;
  websiteEnabled: boolean;
}

export interface PlatformOrganizationRow {
  id: number;
  slug: string;
  name: string;
  status: OrganizationStatus;
  city: string | null;
  websiteEnabled: boolean;
  membersCount: number;
  owners: Array<{ name: string; email: string }>;
  createdAt: Date;
}

/** Organization management for admins: summary + platform onboarding. */
@Injectable()
export class OrganizationAdminService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(OrganizationSettings)
    private readonly settings: Repository<OrganizationSettings>,
    @InjectRepository(OrganizationUser)
    private readonly memberships: Repository<OrganizationUser>,
    private readonly users: UsersService,
  ) {}

  async summary(organizationId: number): Promise<OrganizationAdminSummary> {
    const organization = await this.organizations.findOne({
      where: { id: organizationId },
      relations: { logo: true },
    });
    if (!organization) throw new NotFoundException('Organization not found');
    const settings = await this.settings.findOneBy({ organizationId });
    return {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      status: organization.status,
      logoUrl: organization.logo?.url ?? null,
      brandPrimaryColor: organization.brandPrimaryColor,
      timezone: organization.timezone,
      currencyCode: organization.currencyCode,
      websiteEnabled: settings?.websiteEnabled ?? false,
    };
  }

  async listForPlatform(query: ListQueryDto): Promise<Page<PlatformOrganizationRow>> {
    const { column, direction } = resolveSort(
      query.sort,
      { name: 'r.name', createdAt: 'r.createdAt', status: 'r.status' },
      { field: 'createdAt', direction: 'DESC' },
    );
    const qb = this.organizations
      .createQueryBuilder('r')
      .leftJoinAndMapOne(
        'r.settings',
        OrganizationSettings,
        's',
        's.organizationId = r.id',
      )
      .orderBy(column, direction)
      .addOrderBy('r.id', direction);
    if (query.q) {
      qb.andWhere('(r.name LIKE :term OR r.slug LIKE :term OR r.city LIKE :term)', {
        term: `%${escapeLike(query.q)}%`,
      });
    }

    const { skip, take } = pageWindow(query);
    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();
    const ids = rows.map((r) => r.id);
    const members = ids.length
      ? await this.memberships.find({
          where: { organizationId: In(ids) },
          relations: { user: true },
        })
      : [];

    return toPage(
      rows.map((organization) => {
        const settings = (
          organization as Organization & { settings?: OrganizationSettings }
        ).settings;
        const own = members.filter(
          (m) => m.organizationId === organization.id && m.user,
        );
        return {
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
          status: organization.status,
          city: organization.city,
          websiteEnabled: settings?.websiteEnabled ?? false,
          membersCount: own.length,
          owners: own
            .filter((m) => m.role === OrganizationRole.Owner)
            .map((m) => ({ name: m.user!.name, email: m.user!.email })),
          createdAt: organization.createdAt,
        };
      }),
      total,
      query,
    );
  }

  /**
   * Onboarding: organization + settings + owner membership in one
   * transaction. The organization starts as a draft; the owner finishes setup
   * and a platform admin publishes it.
   */
  async onboard(
    dto: CreateOrganizationDto,
    actorUserId: number,
  ): Promise<Organization> {
    await this.assertSlugFree(dto.slug);
    return this.dataSource.transaction(async (manager) => {
      const organization = await manager.getRepository(Organization).save(
        manager.getRepository(Organization).create({
          slug: dto.slug,
          name: dto.name,
          status: OrganizationStatus.Draft,
          createdByUserId: actorUserId,
        }),
      );
      await manager.getRepository(OrganizationSettings).save({
        organizationId: organization.id,
        websiteEnabled: true,
      });

      const { user } = await this.users.findOrCreate(manager, dto.owner);
      await manager.getRepository(OrganizationUser).save({
        organizationId: organization.id,
        userId: user.id,
        role: OrganizationRole.Owner,
        isActive: true,
        invitedByUserId: actorUserId,
      });
      return organization;
    });
  }

  async updatePlatform(
    id: number,
    dto: UpdatePlatformOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.organizations.findOneBy({ id });
    if (!organization) throw new NotFoundException('Organization not found');
    if (dto.slug && dto.slug !== organization.slug)
      await this.assertSlugFree(dto.slug, id);

    if (dto.name !== undefined) organization.name = dto.name;
    if (dto.slug !== undefined) organization.slug = dto.slug;
    if (dto.status !== undefined) organization.status = dto.status;
    return this.organizations.save(organization);
  }

  async counts() {
    const rows = await this.organizations
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.status')
      .getRawMany<{ status: OrganizationStatus; count: string }>();
    const byStatus = Object.fromEntries(
      rows.map((row) => [row.status, Number(row.count)]),
    );
    return {
      total: rows.reduce((sum, row) => sum + Number(row.count), 0),
      active: byStatus[OrganizationStatus.Active] ?? 0,
      draft: byStatus[OrganizationStatus.Draft] ?? 0,
      suspended: byStatus[OrganizationStatus.Suspended] ?? 0,
      archived: byStatus[OrganizationStatus.Archived] ?? 0,
    };
  }

  /** Slugs are globally unique, including soft-deleted rows. */
  private async assertSlugFree(slug: string, exceptId?: number) {
    const taken = await this.organizations.exists({
      where: exceptId ? { slug, id: Not(exceptId) } : { slug },
      withDeleted: true,
    });
    if (taken) {
      throw new DomainException(
        ErrorCode.SlugTaken,
        'That web address is already used by another organization.',
        HttpStatus.CONFLICT,
        undefined,
        [{ field: 'slug', message: 'Already in use' }],
      );
    }
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { permissionsFor, type Permission } from '@common/constants/roles.config';
import { OrganizationRole, OrganizationStatus } from '@common/constants/tenancy.enums';
import { TenantContext } from '@common/tenancy/tenant-context';
import { OrganizationUser } from '@database/entities/identity/organization-user.entity';
import { User } from '@database/entities/identity/user.entity';
import { Organization } from '@database/entities/tenancy/organization.entity';

export interface AccessibleOrganization {
  id: number;
  slug: string;
  name: string;
  status: OrganizationStatus;
  brandPrimaryColor: string;
  /** For showing dates and prices on the organization's own clock and currency. */
  timezone: string;
  currencyCode: string;
  role: OrganizationRole | null;
  permissions: Permission[];
}

/**
 * Who may act where. Everything is read per request (no role in the token),
 * so removing a membership or deactivating a user takes effect immediately.
 */
@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(OrganizationUser)
    private readonly memberships: Repository<OrganizationUser>,
  ) {}

  /**
   * TenantContext for `userId` acting in `organizationId`.
   *  - 401 when the account is gone or deactivated (the session should end)
   *  - 403 for non-members, inactive memberships and archived organizations —
   *    the same answer whether or not the organization exists
   *  - super admins get every permission; 404 if the organization is missing
   */
  async resolveTenant(userId: number, organizationId: number): Promise<TenantContext> {
    const user = await this.activeUser(userId);

    const organization = await this.organizations.findOne({
      where: { id: organizationId },
      select: { id: true, status: true },
    });

    const membership = organization
      ? await this.memberships.findOne({ where: { organizationId, userId } })
      : null;

    if (user.isSuperAdmin) {
      if (!organization) throw new NotFoundException('Organization not found');
      return {
        organizationId,
        userId,
        role: membership?.role ?? null,
        permissions: permissionsFor(null, true),
        isSuperAdmin: true,
      };
    }

    if (
      !organization ||
      !membership ||
      !membership.isActive ||
      organization.status === OrganizationStatus.Archived
    ) {
      throw new ForbiddenException("You don't have access to this organization");
    }

    return {
      organizationId,
      userId,
      role: membership.role,
      permissions: permissionsFor(membership.role),
      isSuperAdmin: false,
    };
  }

  /** Organizations for the switcher, with the caller's permissions in each. */
  async accessibleOrganizations(userId: number): Promise<AccessibleOrganization[]> {
    const user = await this.activeUser(userId);
    const memberships = await this.memberships.find({
      where: { userId, isActive: true },
      relations: { organization: true },
    });
    const byOrganization = new Map(memberships.map((m) => [m.organizationId, m]));

    const organizations = user.isSuperAdmin
      ? await this.organizations.find({
          where: { status: Not(OrganizationStatus.Archived) },
          order: { name: 'ASC' },
        })
      : memberships
          .map((m) => m.organization)
          .filter(
            (r): r is Organization =>
              !!r && !r.deletedAt && r.status !== OrganizationStatus.Archived,
          )
          .sort((a, b) => a.name.localeCompare(b.name));

    return organizations.map((organization) => {
      const role = byOrganization.get(organization.id)?.role ?? null;
      return {
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
        status: organization.status,
        brandPrimaryColor: organization.brandPrimaryColor,
        timezone: organization.timezone,
        currencyCode: organization.currencyCode,
        role,
        permissions: permissionsFor(role, user.isSuperAdmin),
      };
    });
  }

  /** Database check for @PlatformOnly() — the token's `sa` claim is only a hint. */
  async isActiveSuperAdmin(userId: number): Promise<boolean> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, isActive: true, isSuperAdmin: true },
    });
    return Boolean(user?.isActive && user.isSuperAdmin);
  }

  private async activeUser(userId: number): Promise<User> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, isActive: true, isSuperAdmin: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }
}

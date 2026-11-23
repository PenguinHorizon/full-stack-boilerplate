import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationStatus } from '@common/constants/tenancy.enums';
import { InquiryStatus } from '@common/constants/website';
import { hasPermission, TenantContext } from '@common/tenancy/tenant-context';
import { Customer } from '@database/entities/customers/customer.entity';
import { AuditLog } from '@database/entities/identity/audit-log.entity';
import { OrganizationUser } from '@database/entities/identity/organization-user.entity';
import { Organization } from '@database/entities/tenancy/organization.entity';
import { OrganizationSettings } from '@database/entities/tenancy/organization-settings.entity';
import { Inquiry } from '@database/entities/website/inquiry.entity';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { OrganizationAdminService } from '@modules/organizations/organization-admin.service';
import { UsersService } from '@modules/users/users.service';

export interface ChecklistItem {
  key: 'details' | 'logo' | 'team' | 'publish';
  label: string;
  description: string;
  done: boolean;
}

/**
 * Dashboard data from live tables only (no fixed numbers): setup progress,
 * team, customers and inquiries. Add domain KPIs here as features land.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(OrganizationSettings)
    private readonly settings: Repository<OrganizationSettings>,
    @InjectRepository(OrganizationUser)
    private readonly memberships: Repository<OrganizationUser>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Inquiry) private readonly inquiries: Repository<Inquiry>,
    private readonly auditLog: AuditLogService,
    private readonly organizationAdmin: OrganizationAdminService,
    private readonly users: UsersService,
  ) {}

  async organization(ctx: TenantContext) {
    const organizationId = ctx.organizationId;
    const [organization, settings, teamMembers, customers, newInquiries] =
      await Promise.all([
        this.organizations.findOneByOrFail({ id: organizationId }),
        this.settings.findOneBy({ organizationId }),
        hasPermission(ctx, 'team.view')
          ? this.memberships.count({ where: { organizationId, isActive: true } })
          : Promise.resolve(null),
        hasPermission(ctx, 'customer.view')
          ? this.customers.count({ where: { organizationId } })
          : Promise.resolve(null),
        hasPermission(ctx, 'inquiry.view')
          ? this.inquiries.count({
              where: { organizationId, status: InquiryStatus.New },
            })
          : Promise.resolve(null),
      ]);

    // Setup progress matters to the people who can act on it.
    const checklist: ChecklistItem[] = hasPermission(ctx, 'organization.update')
      ? [
          {
            key: 'details',
            label: 'Add your business details',
            description: 'A description, phone number and address customers can trust.',
            done: Boolean(
              organization.shortDescription &&
              organization.contactPhone &&
              organization.addressLine,
            ),
          },
          {
            key: 'logo',
            label: 'Upload your logo',
            description: 'Shown in your website header, browser tab and the directory.',
            done: organization.logoMediaId !== null,
          },
          {
            key: 'team',
            label: 'Invite your team',
            description:
              'Give your colleagues their own sign-in with the right access.',
            done: (teamMembers ?? 0) > 1,
          },
          {
            key: 'publish',
            label: 'Publish your website',
            description: 'Your site goes live once your account is active.',
            done:
              organization.status === OrganizationStatus.Active &&
              Boolean(settings?.websiteEnabled),
          },
        ]
      : [];

    const recentActivity = hasPermission(ctx, 'audit.view')
      ? (await this.auditLog.list({ organizationId }, { page: 1, pageSize: 8 })).items
      : [];

    return {
      organization: {
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
        websiteEnabled: settings?.websiteEnabled ?? false,
      },
      counts: { teamMembers, customers, newInquiries },
      checklist,
      recentActivity: recentActivity as AuditLog[],
    };
  }

  async platform() {
    const [organizations, users, activity] = await Promise.all([
      this.organizationAdmin.counts(),
      this.users.stats(),
      this.auditLog.list({}, { page: 1, pageSize: 10 }),
    ]);
    return { organizations, users, recentActivity: activity.items };
  }
}

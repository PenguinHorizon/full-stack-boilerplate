import { ApiProperty } from '@nestjs/swagger';
import { PageMetaResponse } from './common.contracts';

/*
 * Staff identity, access, team and platform contracts (ADR-006).
 * Roles are per organization: the principal carries none; the organizations a
 * user can open — with role and permissions — come from
 * GET /admin/me/organizations.
 */

const ORGANIZATION_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'];
const ORGANIZATION_STATUSES = ['draft', 'active', 'suspended', 'archived'];

/* ── Auth ──────────────────────────────────────────────────────────── */

/** The signed-in staff user (`GET/PATCH /auth/me`, `user` in a session). */
export class StaffPrincipalResponse {
  @ApiProperty({ type: 'integer' }) userId: number;
  @ApiProperty() userCode: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ type: String, nullable: true }) avatar: string | null;
  @ApiProperty() isSuperAdmin: boolean;
}

export class AuthSessionResponse {
  @ApiProperty({ type: () => StaffPrincipalResponse }) user: StaffPrincipalResponse;
  @ApiProperty() accessToken: string;
  @ApiProperty({ type: 'integer', description: 'Access token lifetime in seconds' })
  expiresIn: number;
}

export class AccessTokenResponse {
  @ApiProperty() accessToken: string;
  @ApiProperty({ type: 'integer' }) expiresIn: number;
}

export class MessageResponse {
  @ApiProperty() message: string;
}

/* ── Access ────────────────────────────────────────────────────────── */

export class AccessibleOrganizationResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ORGANIZATION_STATUSES }) status: string;
  @ApiProperty() brandPrimaryColor: string;
  @ApiProperty({ example: 'Asia/Karachi' }) timezone: string;
  @ApiProperty({ example: 'PKR' }) currencyCode: string;
  @ApiProperty({
    enum: ORGANIZATION_ROLES,
    nullable: true,
    description: 'null for a super admin without a membership',
  })
  role: string | null;
  @ApiProperty({ type: [String] }) permissions: string[];
}

/* ── Team ──────────────────────────────────────────────────────────── */

export class TeamUserResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: string | null;
}

export class TeamMemberResponse {
  @ApiProperty({ type: 'integer', description: 'Membership id' }) id: number;
  @ApiProperty({ enum: ORGANIZATION_ROLES }) role: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: () => TeamUserResponse }) user: TeamUserResponse;
}

export class TeamMemberPageResponse {
  @ApiProperty({ type: () => [TeamMemberResponse] }) items: TeamMemberResponse[];
  @ApiProperty({ type: () => PageMetaResponse }) meta: PageMetaResponse;
}

/* ── Organization admin ──────────────────────────────────────────────── */

export class OrganizationAdminSummaryResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ORGANIZATION_STATUSES }) status: string;
  @ApiProperty({ type: String, nullable: true }) logoUrl: string | null;
  @ApiProperty() brandPrimaryColor: string;
  @ApiProperty() timezone: string;
  @ApiProperty() currencyCode: string;
  @ApiProperty() websiteEnabled: boolean;
}

export class ChecklistItemResponse {
  @ApiProperty({ enum: ['details', 'logo', 'team', 'publish'] })
  key: string;
  @ApiProperty() label: string;
  @ApiProperty() description: string;
  @ApiProperty() done: boolean;
}

export class DashboardOrganizationResponse {
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ enum: ORGANIZATION_STATUSES }) status: string;
  @ApiProperty() websiteEnabled: boolean;
}

export class DashboardCountsResponse {
  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'null when the caller cannot view the team',
  })
  teamMembers: number | null;
  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'Customers; null without customer.view',
  })
  customers: number | null;
  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'Unread inquiries; null without inquiry.view',
  })
  newInquiries: number | null;
}

/* ── Audit ─────────────────────────────────────────────────────────── */

export class AuditLogResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty({ type: 'integer', nullable: true }) organizationId: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) userId: number | null;
  @ApiProperty({ type: String, nullable: true }) userName: string | null;
  @ApiProperty() action: string;
  @ApiProperty() module: string;
  @ApiProperty({ type: String, nullable: true }) entityType: string | null;
  @ApiProperty({ type: String, nullable: true }) entityId: string | null;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  metadata: Record<string, unknown> | null;
  @ApiProperty({ type: String, nullable: true }) ipAddress: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class AuditLogPageResponse {
  @ApiProperty({ type: () => [AuditLogResponse] }) items: AuditLogResponse[];
  @ApiProperty({ type: () => PageMetaResponse }) meta: PageMetaResponse;
}

export class OrganizationDashboardResponse {
  @ApiProperty({ type: () => DashboardOrganizationResponse })
  organization: DashboardOrganizationResponse;
  @ApiProperty({ type: () => DashboardCountsResponse }) counts: DashboardCountsResponse;
  @ApiProperty({
    type: () => [ChecklistItemResponse],
    description: 'Setup progress; empty unless the caller can update the organization',
  })
  checklist: ChecklistItemResponse[];
  @ApiProperty({
    type: () => [AuditLogResponse],
    description: 'Empty without audit.view',
  })
  recentActivity: AuditLogResponse[];
}

/* ── Platform ──────────────────────────────────────────────────────── */

export class PlatformUserResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty({ type: String, nullable: true }) userCode: string | null;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isSuperAdmin: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: string | null;
  @ApiProperty({ type: 'integer' }) membershipsCount: number;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class PlatformUserPageResponse {
  @ApiProperty({ type: () => [PlatformUserResponse] }) items: PlatformUserResponse[];
  @ApiProperty({ type: () => PageMetaResponse }) meta: PageMetaResponse;
}

export class OrganizationOwnerRefResponse {
  @ApiProperty() name: string;
  @ApiProperty() email: string;
}

export class PlatformOrganizationResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ORGANIZATION_STATUSES }) status: string;
  @ApiProperty({ type: String, nullable: true }) city: string | null;
  @ApiProperty() websiteEnabled: boolean;
  @ApiProperty({ type: 'integer' }) membersCount: number;
  @ApiProperty({ type: () => [OrganizationOwnerRefResponse] })
  owners: OrganizationOwnerRefResponse[];
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class PlatformOrganizationPageResponse {
  @ApiProperty({ type: () => [PlatformOrganizationResponse] })
  items: PlatformOrganizationResponse[];
  @ApiProperty({ type: () => PageMetaResponse }) meta: PageMetaResponse;
}

export class OrganizationCountsResponse {
  @ApiProperty({ type: 'integer' }) total: number;
  @ApiProperty({ type: 'integer' }) active: number;
  @ApiProperty({ type: 'integer' }) draft: number;
  @ApiProperty({ type: 'integer' }) suspended: number;
  @ApiProperty({ type: 'integer' }) archived: number;
}

export class UserStatsResponse {
  @ApiProperty({ type: 'integer' }) total: number;
  @ApiProperty({ type: 'integer' }) active: number;
  @ApiProperty({ type: 'integer' }) inactive: number;
  @ApiProperty({ type: 'integer' }) superAdmins: number;
}

export class PlatformDashboardResponse {
  @ApiProperty({ type: () => OrganizationCountsResponse })
  organizations: OrganizationCountsResponse;
  @ApiProperty({ type: () => UserStatsResponse }) users: UserStatsResponse;
  @ApiProperty({ type: () => [AuditLogResponse] }) recentActivity: AuditLogResponse[];
}

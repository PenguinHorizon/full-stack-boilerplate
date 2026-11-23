import { Module } from '@nestjs/common';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { MediaModule } from '@modules/media/media.module';
import { UsersModule } from '@modules/users/users.module';
import {
  PlatformOrganizationsController,
  OrganizationAdminController,
} from './organization-admin.controller';
import { OrganizationAdminService } from './organization-admin.service';
import { OrganizationProfileService } from './organization-profile.service';
import { OrganizationsService } from './organizations.service';

/**
 * Owns the organization tables: public lookups (OrganizationsService), the
 * organization's own profile and settings (OrganizationProfileService), and
 * platform onboarding (OrganizationAdminService).
 */
@Module({
  imports: [UsersModule, AuditLogModule, MediaModule],
  controllers: [OrganizationAdminController, PlatformOrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationAdminService,
    OrganizationProfileService,
  ],
  exports: [OrganizationsService, OrganizationAdminService],
})
export class OrganizationsModule {}

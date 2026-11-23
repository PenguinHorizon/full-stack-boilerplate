import { Module } from '@nestjs/common';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { UsersModule } from '@modules/users/users.module';
import {
  PlatformDashboardController,
  OrganizationDashboardController,
} from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/** Read-only: aggregates other modules' services and never writes. */
@Module({
  imports: [AuditLogModule, OrganizationsModule, UsersModule],
  controllers: [OrganizationDashboardController, PlatformDashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

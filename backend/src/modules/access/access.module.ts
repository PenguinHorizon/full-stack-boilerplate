import { Module } from '@nestjs/common';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { TenantGuard } from './guards/tenant.guard';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

/**
 * Who may do what, where: memberships, the tenant and
 * permission guards (registered globally in AppModule), and team management.
 */
@Module({
  imports: [AuthModule, UsersModule, AuditLogModule],
  controllers: [AccessController, TeamController],
  providers: [AccessService, TeamService, TenantGuard, PermissionsGuard],
  exports: [AccessService, TenantGuard, PermissionsGuard],
})
export class AccessModule {}

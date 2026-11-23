import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { PlatformUsersController } from './platform-users.controller';
import { UsersService } from './users.service';

/**
 * Staff accounts. Platform-level management lives here; organization access is
 * managed through memberships (AccessModule → team).
 */
@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [PlatformUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

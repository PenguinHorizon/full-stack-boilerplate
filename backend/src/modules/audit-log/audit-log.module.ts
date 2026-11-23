import { Module } from '@nestjs/common';
import {
  PlatformAuditLogController,
  OrganizationAuditLogController,
} from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

@Module({
  controllers: [OrganizationAuditLogController, PlatformAuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}

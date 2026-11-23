import { Module } from '@nestjs/common';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { ContentController, InquiriesController } from './content.controller';
import { ContentService } from './content.service';

/** Website editors and the contact inbox. The storefront reads in PublicModule. */
@Module({
  imports: [AuditLogModule],
  controllers: [ContentController, InquiriesController],
  providers: [ContentService],
})
export class ContentModule {}

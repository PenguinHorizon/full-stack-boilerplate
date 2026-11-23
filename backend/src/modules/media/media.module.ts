import { Module } from '@nestjs/common';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { CloudinaryStorageProvider } from './storage/cloudinary-storage.provider';
import { LocalStorageProvider } from './storage/local-storage.provider';

/** Organization media library; replaces the boilerplate `/upload` endpoints. */
@Module({
  imports: [AuditLogModule],
  controllers: [MediaController],
  providers: [MediaService, LocalStorageProvider, CloudinaryStorageProvider],
  exports: [MediaService],
})
export class MediaModule {}

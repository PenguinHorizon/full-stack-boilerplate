import { Module } from '@nestjs/common';
import { AccessModule } from '@modules/access/access.module';
import { AuthModule } from '@modules/auth/auth.module';
import { MailModule } from '@modules/mail/mail.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { PublicOrganizationsController } from './public-organizations.controller';
import { StorefrontController, StorefrontSeoController } from './storefront.controller';
import { StorefrontContentService } from './storefront-content.service';
import { StorefrontHomeService } from './storefront-home.service';
import { StorefrontPreviewService } from './storefront-preview.service';
import { StorefrontSeoService } from './storefront-seo.service';

/**
 * Read-only storefront API (plus the contact form): site bootstrap, home,
 * content pages and SEO files. It aggregates other modules' services; the
 * only table it writes is `inquiries`.
 */
@Module({
  imports: [
    OrganizationsModule,
    MailModule,
    AuthModule,
    AccessModule,
    NotificationsModule,
  ],
  controllers: [
    PublicOrganizationsController,
    StorefrontController,
    StorefrontSeoController,
  ],
  providers: [
    StorefrontContentService,
    StorefrontHomeService,
    StorefrontSeoService,
    StorefrontPreviewService,
  ],
})
export class PublicModule {}

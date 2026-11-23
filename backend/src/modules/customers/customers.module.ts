import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { MailModule } from '@modules/mail/mail.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { CustomerAccountController } from './customer-account.controller';
import { CustomerAccountService } from './customer-account.service';
import { CustomerAuthGuard } from './customer-auth.guard';
import { CustomerTokenService } from './customer-token.service';
import { CustomersAdminController } from './customers-admin.controller';
import { CustomersAdminService } from './customers-admin.service';

/** Storefront customer accounts: sessions, profile, addresses. */
@Module({
  // Secrets, issuer and audience are passed on every sign/verify call.
  imports: [JwtModule.register({}), OrganizationsModule, MailModule, AuditLogModule],
  controllers: [CustomerAccountController, CustomersAdminController],
  providers: [
    CustomerTokenService,
    CustomerAccountService,
    CustomerAuthGuard,
    CustomersAdminService,
  ],
  exports: [CustomerTokenService, CustomerAccountService, CustomerAuthGuard],
})
export class CustomersModule {}

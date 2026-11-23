import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { CustomerStatus } from '@common/constants/customers';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';
import { Customer } from '@database/entities/customers/customer.entity';
import { PublicOrganizationRecord } from '@modules/organizations/organizations.mapper';
import { OrganizationsService } from '@modules/organizations/organizations.service';
import { CustomerTokenService } from './customer-token.service';

/** The signed-in customer of the organization in the path. */
export interface CustomerSession {
  customer: Customer;
  organization: PublicOrganizationRecord;
}

const SESSION_KEY = 'customerSession';

export function bearerToken(req: Request): string | undefined {
  const [type, token] = req.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}

/**
 * Guards `/storefront/:slug/me…`. The token must be a
 * customer token for the organization named by `:slug`, and the customer is
 * re-read so a block takes effect at once rather than at token expiry.
 * Routes using it are also `@Public()`, which only skips the staff guard.
 */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: CustomerTokenService,
    private readonly organizations: OrganizationsService,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const organization = await this.organizations.findPublicBySlug(
      String(req.params.slug),
    );
    const principal = await this.tokens.verify(bearerToken(req), organization.id);
    if (!principal) throw new UnauthorizedException('Sign in to continue');

    const customer = await this.customers.findOneBy({
      id: principal.customerId,
      organizationId: organization.id,
    });
    if (!customer || !customer.registeredAt) {
      throw new UnauthorizedException('Sign in to continue');
    }
    if (customer.status === CustomerStatus.Blocked) {
      throw new DomainException(
        ErrorCode.CustomerBlocked,
        'This account can’t be used. Please contact the organization.',
        HttpStatus.FORBIDDEN,
      );
    }
    (req as unknown as Record<string, unknown>)[SESSION_KEY] = {
      customer,
      organization,
    } satisfies CustomerSession;
    return true;
  }
}

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CustomerSession =>
    (
      context.switchToHttp().getRequest<Request>() as unknown as Record<string, unknown>
    )[SESSION_KEY] as CustomerSession,
);

import { HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { MoreThan, QueryFailedError, Repository } from 'typeorm';
import { CustomerStatus } from '@common/constants/customers';
import { normalizePhone } from '@common/domain/phone';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';
import { comparePassword, hashPassword } from '@common/helpers/password.helper';
import { CustomerProfileResponse } from '@contracts/customers.contracts';
import { Customer } from '@database/entities/customers/customer.entity';
import { MailService } from '@modules/mail/mail.service';
import { PublicOrganizationRecord } from '@modules/organizations/organizations.mapper';
import {
  ChangeCustomerPasswordDto,
  LoginCustomerDto,
  RegisterCustomerDto,
  UpdateCustomerProfileDto,
} from './customers.dto';

const MYSQL_DUPLICATE_ENTRY = 1062;
const RESET_TTL_MS = 60 * 60 * 1000;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function toProfile(customer: Customer): CustomerProfileResponse {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    registeredAt: customer.registeredAt?.toISOString() ?? null,
  };
}

const isDuplicate = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { errno?: number } | undefined)?.errno ===
    MYSQL_DUPLICATE_ENTRY;

/**
 * Public-site customer accounts. One account per phone per organization:
 * registering a phone that already exists as a guest record claims it.
 * Emails are unique per organization when present.
 */
@Injectable()
export class CustomerAccountService {
  private readonly logger = new Logger(CustomerAccountService.name);

  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly mail: MailService,
  ) {}

  phoneOf(
    organization: PublicOrganizationRecord,
    input: string,
    field = 'phone',
  ): string {
    const phone = normalizePhone(input, organization.countryCode);
    if (!phone) {
      throw new DomainException(
        ErrorCode.ValidationFailed,
        'Validation failed',
        HttpStatus.BAD_REQUEST,
        undefined,
        [{ field, message: 'Enter a valid phone number' }],
      );
    }
    return phone;
  }

  async register(
    organization: PublicOrganizationRecord,
    dto: RegisterCustomerDto,
  ): Promise<Customer> {
    const phone = this.phoneOf(organization, dto.phone);
    const email = dto.email?.toLowerCase() ?? null;
    const existing = await this.customers.findOneBy({
      organizationId: organization.id,
      phone,
    });
    if (existing?.registeredAt) {
      throw new DomainException(
        ErrorCode.PhoneTaken,
        'An account with this phone number already exists. Sign in instead.',
        HttpStatus.CONFLICT,
      );
    }
    if (email) await this.assertEmailFree(organization.id, email, existing?.id ?? null);

    const customer =
      existing ?? this.customers.create({ organizationId: organization.id, phone });
    if (customer.status === CustomerStatus.Blocked) throw blocked();
    customer.name = dto.name;
    customer.email = email;
    customer.password = await hashPassword(dto.password);
    customer.registeredAt = new Date();
    customer.lastLoginAt = new Date();
    try {
      return await this.customers.save(customer);
    } catch (error) {
      if (isDuplicate(error)) {
        throw new DomainException(
          ErrorCode.PhoneTaken,
          'An account with this phone number or email already exists. Sign in instead.',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async login(
    organization: PublicOrganizationRecord,
    dto: LoginCustomerDto,
  ): Promise<Customer> {
    const identifier = dto.identifier.trim();
    const where = identifier.includes('@')
      ? { organizationId: organization.id, email: identifier.toLowerCase() }
      : {
          organizationId: organization.id,
          phone: normalizePhone(identifier, organization.countryCode) ?? '',
        };
    const customer = await this.customers.findOne({
      where,
      select: { id: true, password: true },
    });
    const valid =
      customer?.password && (await comparePassword(dto.password, customer.password));
    if (!customer || !valid) {
      throw new UnauthorizedException('That phone/email and password don’t match');
    }
    const full = await this.customers.findOneByOrFail({ id: customer.id });
    if (full.status === CustomerStatus.Blocked) throw blocked();
    full.lastLoginAt = new Date();
    return this.customers.save(full);
  }

  /** Always succeeds; emails a link only when an account has that address. */
  async forgotPassword(
    organization: PublicOrganizationRecord,
    email: string,
    origin: string,
  ): Promise<void> {
    const customer = await this.customers.findOneBy({
      organizationId: organization.id,
      email: email.toLowerCase(),
    });
    if (!customer?.registeredAt || customer.status !== CustomerStatus.Active) return;
    const token = randomBytes(32).toString('base64url');
    await this.customers.update(customer.id, {
      resetPasswordToken: sha256(token),
      resetPasswordExpires: new Date(Date.now() + RESET_TTL_MS),
    });
    void this.mail
      .send({
        to: customer.email!,
        subject: `Reset your ${organization.name} password`,
        text: [
          `Hi ${customer.name},`,
          '',
          `Someone asked to reset the password of your ${organization.name} account.`,
          `Choose a new one here (the link works for one hour):`,
          `${origin}/account/reset-password?token=${token}`,
          '',
          'If it wasn’t you, ignore this email: your password stays the same.',
        ].join('\n'),
      })
      .catch((error) => this.logger.error(`Reset email failed: ${String(error)}`));
  }

  async resetPassword(
    organization: PublicOrganizationRecord,
    token: string,
    password: string,
  ): Promise<Customer> {
    const customer = await this.customers.findOneBy({
      organizationId: organization.id,
      resetPasswordToken: sha256(token),
      resetPasswordExpires: MoreThan(new Date()),
    });
    if (!customer) {
      throw new DomainException(
        ErrorCode.BadRequest,
        'This reset link is invalid or has expired. Ask for a new one.',
        HttpStatus.BAD_REQUEST,
      );
    }
    customer.password = await hashPassword(password);
    customer.resetPasswordToken = null;
    customer.resetPasswordExpires = null;
    return this.customers.save(customer);
  }

  async updateProfile(
    customer: Customer,
    dto: UpdateCustomerProfileDto,
  ): Promise<Customer> {
    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.email !== undefined) {
      const email = dto.email?.toLowerCase() ?? null;
      if (email)
        await this.assertEmailFree(customer.organizationId, email, customer.id);
      customer.email = email;
    }
    return this.customers.save(customer);
  }

  async changePassword(
    customer: Customer,
    dto: ChangeCustomerPasswordDto,
  ): Promise<void> {
    const stored = await this.customers.findOne({
      where: { id: customer.id },
      select: { id: true, password: true },
    });
    if (
      !stored?.password ||
      !(await comparePassword(dto.currentPassword, stored.password))
    ) {
      throw new DomainException(
        ErrorCode.ValidationFailed,
        'Validation failed',
        HttpStatus.BAD_REQUEST,
        undefined,
        [{ field: 'currentPassword', message: 'Your current password is not right' }],
      );
    }
    await this.customers.update(customer.id, {
      password: await hashPassword(dto.newPassword),
    });
  }

  private async assertEmailFree(
    organizationId: number,
    email: string,
    exceptId: number | null,
  ) {
    const taken = await this.customers.findOneBy({ organizationId, email });
    if (taken && taken.id !== exceptId) {
      throw new DomainException(
        ErrorCode.EmailTaken,
        'Another account already uses this email.',
        HttpStatus.CONFLICT,
        undefined,
        [{ field: 'email', message: 'Another account already uses this email' }],
      );
    }
  }
}

function blocked() {
  return new DomainException(
    ErrorCode.CustomerBlocked,
    'This account can’t be used. Please contact us.',
    HttpStatus.FORBIDDEN,
  );
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, DataSource, SelectQueryBuilder } from 'typeorm';
import { CustomerStatus } from '@common/constants/customers';
import { resolveSort, toPage } from '@common/pagination/page';
import { TenantContext } from '@common/tenancy/tenant-context';
import { escapeLike } from '@common/utils/sql';
import {
  AdminCustomerDetailResponse,
  AdminCustomerListItemResponse,
  AdminCustomerPageResponse,
} from '@contracts/customers.contracts';
import { Customer } from '@database/entities/customers/customer.entity';
import { CustomerListQueryDto, UpdateCustomerAdminDto } from './customers.dto';
import { CustomerTokenService } from './customer-token.service';

const SORTS = {
  createdAt: 'c.createdAt',
  lastLoginAt: 'c.lastLoginAt',
  name: 'c.name',
} as const;

function listItem(customer: Customer): AdminCustomerListItemResponse {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    hasAccount: customer.registeredAt !== null,
    status: customer.status,
    lastLoginAt: customer.lastLoginAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
  };
}

/**
 * The organization's customers for staff. Blocking signs the customer out
 * everywhere at once.
 */
@Injectable()
export class CustomersAdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tokens: CustomerTokenService,
  ) {}

  private scoped(ctx: TenantContext): SelectQueryBuilder<Customer> {
    return this.dataSource.manager
      .createQueryBuilder(Customer, 'c')
      .where('c.organizationId = :orgId', { orgId: ctx.organizationId });
  }

  async list(
    ctx: TenantContext,
    query: CustomerListQueryDto,
  ): Promise<AdminCustomerPageResponse> {
    const qb = this.scoped(ctx);
    if (query.status) qb.andWhere('c.status = :status', { status: query.status });
    if (query.hasAccount === 'true') qb.andWhere('c.registeredAt IS NOT NULL');
    if (query.hasAccount === 'false') qb.andWhere('c.registeredAt IS NULL');
    if (query.q) {
      const like = `%${escapeLike(query.q)}%`;
      const digits = query.q.replace(/\D/g, '');
      qb.andWhere(
        new Brackets((w) => {
          w.where('c.name LIKE :like', { like }).orWhere('c.email LIKE :like', {
            like,
          });
          if (digits.length >= 4) {
            w.orWhere('c.phone LIKE :phone', { phone: `%${digits.slice(-9)}%` });
          }
        }),
      );
    }
    const sort = resolveSort(query.sort, SORTS, {
      field: 'createdAt',
      direction: 'DESC',
    });
    const [rows, total] = await qb
      .orderBy(sort.column, sort.direction)
      .addOrderBy('c.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return toPage(rows.map(listItem), total, query);
  }

  async detail(ctx: TenantContext, id: number): Promise<AdminCustomerDetailResponse> {
    const customer = await this.find(ctx, id);
    return {
      ...listItem(customer),
      blockedReason: customer.blockedReason,
      adminNotes: customer.adminNotes,
      registeredAt: customer.registeredAt?.toISOString() ?? null,
    };
  }

  /** Block/unblock and internal notes; blocking ends the customer's sessions. */
  async update(
    ctx: TenantContext,
    id: number,
    dto: UpdateCustomerAdminDto,
  ): Promise<{ customer: AdminCustomerDetailResponse; blockedNow: boolean }> {
    const customer = await this.find(ctx, id);
    const changes: Partial<Customer> = {};
    const blockedNow =
      dto.status === CustomerStatus.Blocked &&
      customer.status !== CustomerStatus.Blocked;
    if (dto.status !== undefined) {
      changes.status = dto.status;
      changes.blockedReason =
        dto.status === CustomerStatus.Blocked ? (dto.blockedReason ?? null) : null;
    } else if (dto.blockedReason !== undefined) {
      changes.blockedReason = dto.blockedReason;
    }
    if (dto.adminNotes !== undefined) changes.adminNotes = dto.adminNotes;
    await this.dataSource.manager.update(Customer, customer.id, changes);
    if (blockedNow) await this.tokens.revokeAll(customer.id);
    return { customer: await this.detail(ctx, customer.id), blockedNow };
  }

  private async find(ctx: TenantContext, id: number): Promise<Customer> {
    const customer = await this.scoped(ctx).andWhere('c.id = :id', { id }).getOne();
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}

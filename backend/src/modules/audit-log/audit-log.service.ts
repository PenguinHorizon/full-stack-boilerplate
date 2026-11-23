import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Request } from 'express';
import { AuditLog } from '@database/entities/identity/audit-log.entity';
import { CreateAuditLogDto } from '@common/dto/audit-log.dto';
import { Page, PageRequest, pageWindow, toPage } from '@common/pagination/page';
import { TenantContext } from '@common/tenancy/tenant-context';
import { TENANT_REQUEST_KEY } from '@common/tenancy/tenant.decorator';

export interface AuditFilter {
  organizationId?: number | 'platform';
  userId?: number;
  entityType?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    return this.auditLogs.save(this.auditLogs.create(dto));
  }

  /**
   * Records an entry with request metadata attached.
   *
   * Never throws: an audit-write failure must not fail the business operation
   * that triggered it. A super admin working inside an organization without a
   * membership is flagged `metadata.actingAsSuperAdmin`.
   */
  async record(req: Request, dto: CreateAuditLogDto): Promise<void> {
    const tenant = (req as unknown as Record<string, unknown>)[TENANT_REQUEST_KEY] as
      TenantContext | undefined;
    const actingAsSuperAdmin = Boolean(tenant?.isSuperAdmin && !tenant.role);
    try {
      await this.create({
        ...dto,
        metadata: actingAsSuperAdmin
          ? { ...(dto.metadata ?? {}), actingAsSuperAdmin: true }
          : dto.metadata,
        ipAddress: dto.ipAddress ?? req.ip?.slice(0, 45) ?? null,
        userAgent: dto.userAgent ?? req.get('user-agent')?.slice(0, 255) ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log (${dto.module}/${dto.action})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Newest first. `organizationId: n` limits to one organization (the tenant
   * audit log); `'platform'` to platform-level events; omitted = everything.
   */
  async list(filter: AuditFilter, page: PageRequest): Promise<Page<AuditLog>> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (filter.organizationId === 'platform') where.organizationId = IsNull();
    else if (filter.organizationId !== undefined)
      where.organizationId = filter.organizationId;
    if (filter.userId !== undefined) where.userId = filter.userId;
    if (filter.entityType) where.entityType = filter.entityType;

    const [items, total] = await this.auditLogs.findAndCount({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
      ...pageWindow(page),
    });
    return toPage(items, total, page);
  }
}

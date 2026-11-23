import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { canManageRole, ROLE_LABELS } from '@common/constants/roles.config';
import { OrganizationRole } from '@common/constants/tenancy.enums';
import { AddTeamMemberDto, UpdateTeamMemberDto } from '@common/dto/users.dto';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';
import { Page, pageWindow, toPage } from '@common/pagination/page';
import { TenantContext } from '@common/tenancy/tenant-context';
import { escapeLike } from '@common/utils/sql';
import { OrganizationUser } from '@database/entities/identity/organization-user.entity';
import { AuthService } from '@modules/auth/auth.service';
import { UsersService } from '@modules/users/users.service';

export interface TeamMemberRow {
  id: number;
  role: OrganizationRole;
  isActive: boolean;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
  };
}

/**
 * Organization memberships.
 *
 * Rules: actors manage strictly lower ranks (owners manage everyone;
 * managers only members); an organization always keeps an active owner; nobody
 * changes their own role or removes themselves.
 */
@Injectable()
export class TeamService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrganizationUser)
    private readonly memberships: Repository<OrganizationUser>,
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  async list(ctx: TenantContext, query: ListQueryDto): Promise<Page<TeamMemberRow>> {
    const qb = this.memberships
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.user', 'u')
      .where('m.organizationId = :orgId', { orgId: ctx.organizationId })
      .andWhere('u.deletedAt IS NULL')
      .orderBy('u.name', 'ASC')
      .addOrderBy('m.id', 'ASC');

    if (query.q) {
      qb.andWhere('(u.name LIKE :term OR u.email LIKE :term)', {
        term: `%${escapeLike(query.q)}%`,
      });
    }

    const { skip, take } = pageWindow(query);
    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();
    return toPage(
      rows.map((row) => this.toRow(row)),
      total,
      query,
    );
  }

  async add(ctx: TenantContext, dto: AddTeamMemberDto): Promise<TeamMemberRow> {
    this.assertCanManage(ctx, dto.role);

    const membership = await this.dataSource.transaction(async (manager) => {
      const { user } = await this.users.findOrCreate(manager, {
        email: dto.email,
        name: dto.name,
        password: dto.password,
      });

      const repo = manager.getRepository(OrganizationUser);
      if (
        await repo.exists({
          where: { organizationId: ctx.organizationId, userId: user.id },
        })
      ) {
        throw new DomainException(
          ErrorCode.AlreadyMember,
          `${user.email} is already on this organization's team.`,
          HttpStatus.CONFLICT,
          undefined,
          [{ field: 'email', message: 'Already on the team' }],
        );
      }

      const saved = await repo.save(
        repo.create({
          organizationId: ctx.organizationId,
          userId: user.id,
          role: dto.role,
          isActive: true,
          invitedByUserId: ctx.userId,
        }),
      );
      return saved;
    });

    return this.getRow(ctx, membership.id);
  }

  async update(
    ctx: TenantContext,
    membershipId: number,
    dto: UpdateTeamMemberDto,
  ): Promise<TeamMemberRow> {
    const membership = await this.visibleMembership(ctx, membershipId);
    const self = membership.userId === ctx.userId;

    if (self && dto.role !== undefined && dto.role !== membership.role) {
      throw new ForbiddenException('You cannot change your own role');
    }
    if (self && dto.isActive === false) {
      throw new ForbiddenException('You cannot deactivate yourself');
    }
    if (!self) this.assertCanManage(ctx, membership.role);
    if (dto.role !== undefined && dto.role !== membership.role) {
      this.assertCanManage(ctx, dto.role);
    }

    const nextRole = dto.role ?? membership.role;
    const leavesOwnership =
      membership.role === OrganizationRole.Owner &&
      membership.isActive &&
      (nextRole !== OrganizationRole.Owner || dto.isActive === false);
    if (leavesOwnership)
      await this.assertAnotherOwner(ctx.organizationId, membership.id);

    await this.memberships.update(membership.id, {
      role: nextRole,
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });

    return this.getRow(ctx, membership.id);
  }

  async remove(ctx: TenantContext, membershipId: number): Promise<TeamMemberRow> {
    const membership = await this.visibleMembership(ctx, membershipId);
    if (membership.userId === ctx.userId) {
      throw new ForbiddenException('You cannot remove yourself from the team');
    }
    this.assertCanManage(ctx, membership.role);
    if (membership.role === OrganizationRole.Owner && membership.isActive) {
      await this.assertAnotherOwner(ctx.organizationId, membership.id);
    }

    const row = await this.getRow(ctx, membership.id);
    await this.memberships.delete(membership.id);
    return row;
  }

  /** Emails the member a reset link (the same flow as "forgot password"). */
  async sendPasswordReset(
    ctx: TenantContext,
    membershipId: number,
  ): Promise<TeamMemberRow> {
    const membership = await this.visibleMembership(ctx, membershipId);
    if (membership.userId !== ctx.userId) this.assertCanManage(ctx, membership.role);
    const row = await this.getRow(ctx, membership.id);
    await this.auth.forgotPassword(row.user.email);
    return row;
  }

  /* ── helpers ─────────────────────────────────────────────────────── */

  private assertCanManage(ctx: TenantContext, target: OrganizationRole) {
    if (!canManageRole(ctx.role, target, ctx.isSuperAdmin)) {
      throw new DomainException(
        ErrorCode.RoleNotAssignable,
        `Your role can't manage ${ROLE_LABELS[target].toLowerCase()} members.`,
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /** 404 for other organizations' memberships. */
  private async visibleMembership(
    ctx: TenantContext,
    id: number,
  ): Promise<OrganizationUser> {
    const membership = await this.memberships.findOne({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!membership) throw new NotFoundException('Team member not found');
    return membership;
  }

  private async assertAnotherOwner(
    organizationId: number,
    excludingMembershipId: number,
  ) {
    const owners = await this.memberships
      .createQueryBuilder('m')
      .innerJoin('m.user', 'u')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.role = :owner', { owner: OrganizationRole.Owner })
      .andWhere('m.isActive = :yes AND u.isActive = :yes AND u.deletedAt IS NULL', {
        yes: true,
      })
      .andWhere('m.id <> :id', { id: excludingMembershipId })
      .getCount();
    if (owners === 0) {
      throw new DomainException(
        ErrorCode.LastOwner,
        'An organization must keep at least one active owner. Add another owner first.',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async getRow(
    ctx: TenantContext,
    membershipId: number,
  ): Promise<TeamMemberRow> {
    const membership = await this.memberships.findOneOrFail({
      where: { id: membershipId, organizationId: ctx.organizationId },
      relations: { user: true },
    });
    return this.toRow(membership);
  }

  private toRow(membership: OrganizationUser): TeamMemberRow {
    const user = membership.user!;
    return {
      id: membership.id,
      role: membership.role,
      isActive: membership.isActive,
      createdAt: membership.createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }
}

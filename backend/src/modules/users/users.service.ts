import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { User } from '@database/entities/identity/user.entity';
import { OrganizationUser } from '@database/entities/identity/organization-user.entity';
import { hashPassword } from '@common/helpers/password.helper';
import { UpdatePlatformUserDto } from '@common/dto/users.dto';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { PayloadDto } from '@common/dto/payload.dto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';
import { Page, pageWindow, resolveSort, toPage } from '@common/pagination/page';
import { escapeLike } from '@common/utils/sql';
import { TokenService } from '@modules/auth/token.service';

export interface PlatformUserRow {
  id: number;
  userCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: Date | null;
  membershipsCount: number;
  createdAt: Date;
}

export interface StaffAccountInput {
  email: string;
  name: string;
  password?: string;
}

/**
 * Staff accounts at platform level. Organization access is managed through
 * memberships (TeamService); this service owns the account itself.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(OrganizationUser)
    private readonly memberships: Repository<OrganizationUser>,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * The account for `email`, or a new one. A password is required only when
   * the account has to be created. Runs inside the caller's transaction.
   */
  async findOrCreate(
    manager: EntityManager,
    input: StaffAccountInput,
  ): Promise<{ user: User; created: boolean }> {
    const repo = manager.getRepository(User);
    const existing = await repo.findOne({
      where: { email: input.email },
      withDeleted: true,
    });

    if (existing?.deletedAt) {
      throw new DomainException(
        ErrorCode.EmailTaken,
        'This email belongs to a removed account. Ask a platform administrator to restore it.',
        HttpStatus.CONFLICT,
        undefined,
        [{ field: 'email', message: 'Email belongs to a removed account' }],
      );
    }
    if (existing) return { user: existing, created: false };

    if (!input.password) {
      throw new DomainException(
        ErrorCode.PasswordRequired,
        'No account exists for this email yet. Set a password so they can sign in.',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        [{ field: 'password', message: 'Required for a new account' }],
      );
    }

    // userCode derives from the primary key inside the transaction.
    const user = await repo.save(
      repo.create({
        name: input.name,
        email: input.email,
        password: await hashPassword(input.password),
        isActive: true,
        isSuperAdmin: false,
      }),
    );
    user.userCode = `USR${String(user.id).padStart(6, '0')}`;
    await repo.update(user.id, { userCode: user.userCode });
    return { user, created: true };
  }

  async list(query: ListQueryDto): Promise<Page<PlatformUserRow>> {
    const { column, direction } = resolveSort(
      query.sort,
      {
        name: 'user.name',
        email: 'user.email',
        createdAt: 'user.createdAt',
        lastLoginAt: 'user.lastLoginAt',
      },
      { field: 'createdAt', direction: 'DESC' },
    );

    const qb = this.users
      .createQueryBuilder('user')
      .orderBy(column, direction)
      .addOrderBy('user.id', direction);
    if (query.q) {
      qb.andWhere(
        '(user.name LIKE :term OR user.email LIKE :term OR user.userCode LIKE :term)',
        {
          term: `%${escapeLike(query.q)}%`,
        },
      );
    }

    const { skip, take } = pageWindow(query);
    const [users, total] = await qb.skip(skip).take(take).getManyAndCount();
    return toPage(await this.toRows(users), total, query);
  }

  async getRow(id: number): Promise<PlatformUserRow> {
    const [row] = await this.toRows([await this.findOne(id)]);
    return row;
  }

  private async toRows(users: User[]): Promise<PlatformUserRow[]> {
    const counts = await this.membershipCounts(users.map((u) => u.id));
    return users.map((user) => ({
      id: user.id,
      userCode: user.userCode ?? null,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      lastLoginAt: user.lastLoginAt,
      membershipsCount: counts.get(user.id) ?? 0,
      createdAt: user.createdAt,
    }));
  }

  async findOne(id: number): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updatePlatform(
    id: number,
    dto: UpdatePlatformUserDto,
    actor: PayloadDto,
  ): Promise<User> {
    const user = await this.findOne(id);
    const self = user.id === actor.userId;

    if (self && dto.isSuperAdmin === false) {
      throw new ForbiddenException('You cannot remove your own platform access');
    }
    if (self && dto.isActive === false) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const losesSuperAdmin =
      user.isSuperAdmin && (dto.isSuperAdmin === false || dto.isActive === false);
    if (losesSuperAdmin) await this.assertAnotherSuperAdmin(user.id);

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.isSuperAdmin !== undefined) user.isSuperAdmin = dto.isSuperAdmin;
    const saved = await this.users.save(user);

    // A disabled account must not keep renewing its access token.
    if (dto.isActive === false) await this.tokenService.revokeAllForUser(saved.id);
    return saved;
  }

  async remove(id: number, actor: PayloadDto): Promise<void> {
    if (id === actor.userId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const user = await this.findOne(id);
    if (user.isSuperAdmin) await this.assertAnotherSuperAdmin(user.id);
    await this.users.softDelete(user.id);
    await this.tokenService.revokeAllForUser(user.id);
  }

  async stats() {
    const [total, active, superAdmins] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { isActive: true } }),
      this.users.count({ where: { isSuperAdmin: true, isActive: true } }),
    ]);
    return { total, active, inactive: total - active, superAdmins };
  }

  /** The platform must always keep at least one active super admin. */
  private async assertAnotherSuperAdmin(excludingId: number) {
    const others = await this.users
      .createQueryBuilder('user')
      .where('user.isSuperAdmin = :yes AND user.isActive = :yes AND user.id <> :id', {
        yes: true,
        id: excludingId,
      })
      .getCount();
    if (others === 0) {
      throw new DomainException(
        ErrorCode.LastSuperAdmin,
        'The platform needs at least one active super admin.',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async membershipCounts(userIds: number[]): Promise<Map<number, number>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.memberships
      .createQueryBuilder('m')
      .select('m.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where({ userId: In(userIds) })
      .groupBy('m.userId')
      .getRawMany<{ userId: number; count: string }>();
    return new Map(rows.map((row) => [Number(row.userId), Number(row.count)]));
  }
}

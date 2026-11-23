import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';

/**
 * A staff account (customers are separate, ADR-005). What a user may do
 * inside an organization comes from `organization_users` memberships (ADR-006);
 * `isSuperAdmin` is the platform-level flag.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Index('IDX_users_user_code', { unique: true })
  @Column('varchar', { name: 'user_code', length: 20, nullable: true })
  userCode: string;

  @Column('varchar', { name: 'name', length: 255 })
  name: string;

  // Uniqueness belongs in the database, not only in an app-level check.
  @Index('IDX_users_email', { unique: true })
  @Column('varchar', { name: 'email', length: 255 })
  email: string;

  @Column('varchar', { name: 'phone', length: 20, nullable: true })
  phone: string | null;

  @Exclude()
  @Column('varchar', { name: 'password', length: 255 })
  password: string;

  @Column('boolean', { name: 'is_super_admin', default: false })
  isSuperAdmin: boolean;

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column('varchar', { name: 'avatar', length: 500, nullable: true })
  avatar: string | null;

  @Exclude()
  @Column('varchar', { name: 'reset_password_token', length: 64, nullable: true })
  resetPasswordToken: string | null;

  @Exclude()
  @Column('timestamp', { name: 'reset_password_expires', nullable: true })
  resetPasswordExpires: Date | null;

  @Column('datetime', { name: 'last_login_at', precision: 6, nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at', precision: 6 })
  updatedAt: Date;

  /**
   * The only soft-delete mechanism; TypeORM excludes rows with `deleted_at`
   * set from every `find` automatically.
   */
  @DeleteDateColumn({
    type: 'timestamp',
    name: 'deleted_at',
    precision: 6,
    nullable: true,
  })
  deletedAt: Date | null;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}

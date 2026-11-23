import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerStatus } from '@common/constants/customers';
import { Organization } from '../tenancy/organization.entity';

/**
 * An organization's public-site customer (ADR-005: customers are per tenant).
 * A guest contact gets a row keyed by phone; registering sets a password and
 * `registeredAt` on the same row.
 */
@Entity('customers')
@Index('UQ_customers_organization_phone', ['organizationId', 'phone'], { unique: true })
@Index('UQ_customers_organization_email', ['organizationId', 'email'], { unique: true })
@Index('IDX_customers_reset_token', ['resetPasswordToken'])
export class Customer {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_customers_organization',
  })
  organization?: Organization;

  @Column('varchar', { name: 'name', length: 120 })
  name: string;

  /** E.164 in the organization's country. */
  @Column('varchar', { name: 'phone', length: 20 })
  phone: string;

  @Column('varchar', { name: 'email', length: 255, nullable: true })
  email: string | null;

  /** bcrypt; null for guests. */
  @Column('varchar', { name: 'password', length: 255, nullable: true, select: false })
  password: string | null;

  @Column('datetime', { name: 'registered_at', precision: 6, nullable: true })
  registeredAt: Date | null;

  @Column('datetime', { name: 'phone_verified_at', precision: 6, nullable: true })
  phoneVerifiedAt: Date | null;

  @Column('datetime', { name: 'email_verified_at', precision: 6, nullable: true })
  emailVerifiedAt: Date | null;

  @Column('enum', {
    name: 'status',
    enum: CustomerStatus,
    default: CustomerStatus.Active,
  })
  status: CustomerStatus;

  @Column('varchar', { name: 'blocked_reason', length: 255, nullable: true })
  blockedReason: string | null;

  @Column('char', {
    name: 'reset_password_token',
    length: 64,
    nullable: true,
    select: false,
  })
  resetPasswordToken: string | null;

  @Column('datetime', { name: 'reset_password_expires', precision: 6, nullable: true })
  resetPasswordExpires: Date | null;

  @Column('datetime', { name: 'last_login_at', precision: 6, nullable: true })
  lastLoginAt: Date | null;

  @Column('text', { name: 'admin_notes', nullable: true })
  adminNotes: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;

  @DeleteDateColumn({
    type: 'datetime',
    name: 'deleted_at',
    precision: 6,
    nullable: true,
  })
  deletedAt: Date | null;
}

@Entity('customer_refresh_tokens')
@Index('UQ_customer_refresh_tokens_hash', ['tokenHash'], { unique: true })
@Index('IDX_customer_refresh_tokens_customer', ['customerId'])
@Index('IDX_customer_refresh_tokens_family', ['familyId'])
export class CustomerRefreshToken {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_customer_refresh_tokens_organization',
  })
  organization?: Organization;

  @Column('int', { name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'customer_id',
    foreignKeyConstraintName: 'FK_customer_refresh_tokens_customer',
  })
  customer?: Customer;

  @Column('char', { name: 'token_hash', length: 64 })
  tokenHash: string;

  @Column('char', { name: 'family_id', length: 36 })
  familyId: string;

  @Column('datetime', { name: 'expires_at', precision: 6 })
  expiresAt: Date;

  @Column('datetime', { name: 'revoked_at', precision: 6, nullable: true })
  revokedAt: Date | null;

  @Column('char', { name: 'replaced_by', length: 64, nullable: true })
  replacedBy: string | null;

  @Column('varchar', { name: 'user_agent', length: 255, nullable: true })
  userAgent: string | null;

  @Column('varchar', { name: 'ip', length: 45, nullable: true })
  ip: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;
}

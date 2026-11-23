import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationRole } from '@common/constants/tenancy.enums';
import { Organization } from '../tenancy/organization.entity';
import { User } from './user.entity';

/**
 * Membership: a staff user's role inside one organization (ADR-006). One role
 * per user per organization; a person can belong to several organizations.
 */
@Entity('organization_users')
@Index('UQ_organization_users_organization_user', ['organizationId', 'userId'], {
  unique: true,
})
@Index('IDX_organization_users_user', ['userId'])
export class OrganizationUser {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_organization_users_organization',
  })
  organization?: Organization;

  @Column('int', { name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_organization_users_user',
  })
  user?: User;

  @Column('enum', { name: 'role', enum: OrganizationRole })
  role: OrganizationRole;

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column('int', { name: 'invited_by_user_id', nullable: true })
  invitedByUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'invited_by_user_id',
    foreignKeyConstraintName: 'FK_organization_users_invited_by',
  })
  invitedBy?: User | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}

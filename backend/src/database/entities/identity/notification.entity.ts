import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../tenancy/organization.entity';
import { User } from './user.entity';

/** An in-app notification for one staff member in one organization (new orders…). */
@Entity('notifications')
@Index('IDX_notifications_inbox', ['userId', 'organizationId', 'readAt', 'createdAt'])
@Index('IDX_notifications_organization_created', ['organizationId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_notifications_organization',
  })
  organization?: Organization;

  @Column('int', { name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_notifications_user' })
  user?: User;

  @Column('varchar', { name: 'type', length: 50 })
  type: string;

  @Column('varchar', { name: 'title', length: 160 })
  title: string;

  @Column('varchar', { name: 'body', length: 500, nullable: true })
  body: string | null;

  @Column('json', { name: 'data', nullable: true })
  data: Record<string, unknown> | null;

  @Column('datetime', { name: 'read_at', precision: 6, nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;
}

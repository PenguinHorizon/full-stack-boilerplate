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

@Entity('audit_logs')
@Index('IDX_audit_logs_organization_created', ['organizationId', 'createdAt'])
@Index('IDX_audit_logs_entity', ['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  /** NULL for platform-level events (sign-in, platform settings). */
  @Column('int', { name: 'organization_id', nullable: true })
  organizationId: number | null;

  @ManyToOne(() => Organization, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_audit_logs_organization',
  })
  organization?: Organization | null;

  @Index('IDX_audit_logs_user_id')
  @Column('int', { name: 'user_id', nullable: true })
  userId: number | null;

  @Column('varchar', { name: 'user_name', length: 255, nullable: true })
  userName: string | null;

  @Column('varchar', { name: 'action', length: 100 })
  action: string;

  @Column('varchar', { name: 'module', length: 100 })
  module: string;

  @Column('varchar', { name: 'entity_type', length: 50, nullable: true })
  entityType: string | null;

  @Column('varchar', { name: 'entity_id', length: 64, nullable: true })
  entityId: string | null;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('json', { name: 'metadata', nullable: true })
  metadata: unknown | null;

  @Column('varchar', { name: 'ip_address', length: 45, nullable: true })
  ipAddress: string | null;

  @Column('varchar', { name: 'user_agent', length: 255, nullable: true })
  userAgent: string | null;

  // Every listing orders by this column.
  @Index('IDX_audit_logs_created_at')
  @CreateDateColumn({ type: 'timestamp', name: 'created_at', precision: 6 })
  createdAt: Date;
}

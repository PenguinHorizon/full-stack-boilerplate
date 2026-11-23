import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

/**
 * A custom hostname that serves an organization's storefront. Platform
 * subdomains (`{slug}.PLATFORM_DOMAIN`) need no row (ADR-003).
 */
@Entity('organization_domains')
@Index('UQ_organization_domains_hostname', ['hostname'], { unique: true })
@Index('IDX_organization_domains_organization', ['organizationId'])
export class OrganizationDomain {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_organization_domains_organization',
  })
  organization?: Organization;

  /** Lower-case, no scheme, no port. */
  @Column('varchar', { name: 'hostname', length: 253 })
  hostname: string;

  @Column('boolean', { name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column('datetime', { name: 'verified_at', precision: 6, nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;
}

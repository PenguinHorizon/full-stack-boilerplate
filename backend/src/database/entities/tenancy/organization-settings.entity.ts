import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../identity/user.entity';
import { Organization } from './organization.entity';

/**
 * Operational settings, 1:1 with an organization (created alongside it).
 *
 * Mapped as ManyToOne on the primary key rather than OneToOne: the PK already
 * guarantees uniqueness, and OneToOne would add a redundant unique index.
 * Add domain settings (booking rules, tax, …) as columns here.
 */
@Entity('organization_settings')
export class OrganizationSettings {
  @PrimaryColumn('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_organization_settings_organization',
  })
  organization?: Organization;

  @Column('boolean', { name: 'website_enabled', default: true })
  websiteEnabled: boolean;

  @Column('boolean', { name: 'customer_emails_enabled', default: true })
  customerEmailsEnabled: boolean;

  @Column('varchar', { name: 'seo_title', length: 70, nullable: true })
  seoTitle: string | null;

  @Column('varchar', { name: 'seo_description', length: 160, nullable: true })
  seoDescription: string | null;

  @Column('varchar', { name: 'analytics_measurement_id', length: 40, nullable: true })
  analyticsMeasurementId: string | null;

  @Column('varchar', { name: 'footer_text', length: 500, nullable: true })
  footerText: string | null;

  @Column('int', { name: 'updated_by_user_id', nullable: true })
  updatedByUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'updated_by_user_id',
    foreignKeyConstraintName: 'FK_organization_settings_updated_by',
  })
  updatedBy?: User | null;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}

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
import { InquiryStatus } from '@common/constants/website';
import { Organization } from '../tenancy/organization.entity';

/** A contact-form message from the public website, shown in the admin inbox. */
@Entity('inquiries')
@Index('IDX_inquiries_inbox', ['organizationId', 'status', 'createdAt'])
export class Inquiry {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_inquiries_organization',
  })
  organization?: Organization;

  @Column('varchar', { name: 'name', length: 120 })
  name: string;

  @Column('varchar', { name: 'phone', length: 20, nullable: true })
  phone: string | null;

  @Column('varchar', { name: 'email', length: 255, nullable: true })
  email: string | null;

  @Column('varchar', { name: 'subject', length: 160, nullable: true })
  subject: string | null;

  @Column('text', { name: 'message' })
  message: string;

  @Column('enum', { name: 'status', enum: InquiryStatus, default: InquiryStatus.New })
  status: InquiryStatus;

  @Column('varchar', { name: 'ip_address', length: 45, nullable: true })
  ipAddress: string | null;

  @Column('varchar', { name: 'user_agent', length: 255, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}

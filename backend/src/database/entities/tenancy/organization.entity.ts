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
import {
  DEFAULT_BRAND_PRIMARY,
  OrganizationStatus,
  SocialLinks,
} from '@common/constants/tenancy.enums';
import { User } from '../identity/user.entity';
import { MediaAsset } from '../platform/media-asset.entity';

/** The tenant root. Every tenant-owned row carries this table's id (ADR-002). */
@Entity('organizations')
@Index('UQ_organizations_slug', ['slug'], { unique: true })
@Index('IDX_organizations_status', ['status'])
export class Organization {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'slug', length: 60 })
  slug: string;

  @Column('varchar', { name: 'name', length: 120 })
  name: string;

  @Column('enum', {
    name: 'status',
    enum: OrganizationStatus,
    default: OrganizationStatus.Draft,
  })
  status: OrganizationStatus;

  @Column('varchar', { name: 'tagline', length: 160, nullable: true })
  tagline: string | null;

  @Column('varchar', { name: 'short_description', length: 300, nullable: true })
  shortDescription: string | null;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('int', { name: 'logo_media_id', nullable: true })
  logoMediaId: number | null;

  @ManyToOne(() => MediaAsset, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'logo_media_id',
    foreignKeyConstraintName: 'FK_organizations_logo',
  })
  logo?: MediaAsset | null;

  @Column('int', { name: 'cover_media_id', nullable: true })
  coverMediaId: number | null;

  @ManyToOne(() => MediaAsset, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'cover_media_id',
    foreignKeyConstraintName: 'FK_organizations_cover',
  })
  cover?: MediaAsset | null;

  @Column('int', { name: 'favicon_media_id', nullable: true })
  faviconMediaId: number | null;

  @ManyToOne(() => MediaAsset, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'favicon_media_id',
    foreignKeyConstraintName: 'FK_organizations_favicon',
  })
  favicon?: MediaAsset | null;

  @Column('char', {
    name: 'brand_primary_color',
    length: 7,
    default: DEFAULT_BRAND_PRIMARY,
  })
  brandPrimaryColor: string;

  @Column('char', { name: 'brand_accent_color', length: 7, nullable: true })
  brandAccentColor: string | null;

  @Column('varchar', { name: 'contact_phone', length: 20, nullable: true })
  contactPhone: string | null;

  @Column('varchar', { name: 'contact_email', length: 255, nullable: true })
  contactEmail: string | null;

  @Column('varchar', { name: 'website_url', length: 255, nullable: true })
  websiteUrl: string | null;

  @Column('varchar', { name: 'whatsapp_number', length: 20, nullable: true })
  whatsappNumber: string | null;

  @Column('varchar', { name: 'address_line', length: 255, nullable: true })
  addressLine: string | null;

  @Column('varchar', { name: 'city', length: 100, nullable: true })
  city: string | null;

  @Column('char', { name: 'country_code', length: 2, default: 'PK' })
  countryCode: string;

  @Column('json', { name: 'social_links', nullable: true })
  socialLinks: SocialLinks | null;

  @Column('varchar', { name: 'timezone', length: 64, default: 'Asia/Karachi' })
  timezone: string;

  @Column('char', { name: 'currency_code', length: 3, default: 'PKR' })
  currencyCode: string;

  @Column('varchar', { name: 'locale', length: 10, default: 'en-PK' })
  locale: string;

  @Column('int', { name: 'created_by_user_id', nullable: true })
  createdByUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'created_by_user_id',
    foreignKeyConstraintName: 'FK_organizations_created_by',
  })
  createdBy?: User | null;

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

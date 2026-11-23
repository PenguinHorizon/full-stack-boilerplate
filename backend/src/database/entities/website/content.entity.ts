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
import {
  BannerPlacement,
  ContentStatus,
  PageKey,
  SectionKey,
} from '@common/constants/website';
import { User } from '../identity/user.entity';
import { MediaAsset } from '../platform/media-asset.entity';
import { Organization } from '../tenancy/organization.entity';

/*
 * Website content (the storefront reads it; the admin edits it). Only
 * `published` rows reach the storefront.
 */

/** One row per home section: on/off, order, optional title and settings. */
@Entity('website_sections')
@Index('UQ_website_sections_organization_key', ['organizationId', 'sectionKey'], {
  unique: true,
})
export class WebsiteSection {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_website_sections_organization',
  })
  organization?: Organization;

  @Column('enum', { name: 'section_key', enum: SectionKey })
  sectionKey: SectionKey;

  @Column('boolean', { name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column('int', { name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column('varchar', { name: 'title', length: 160, nullable: true })
  title: string | null;

  @Column('varchar', { name: 'subtitle', length: 300, nullable: true })
  subtitle: string | null;

  @Column('json', { name: 'settings', nullable: true })
  settings: Record<string, unknown> | null;

  @Column('int', { name: 'updated_by_user_id', nullable: true })
  updatedByUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'updated_by_user_id',
    foreignKeyConstraintName: 'FK_website_sections_updated_by',
  })
  updatedBy?: User | null;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}

@Entity('banners')
@Index('IDX_banners_public', ['organizationId', 'placement', 'status', 'sortOrder'])
export class Banner {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_banners_organization',
  })
  organization?: Organization;

  @Column('enum', { name: 'placement', enum: BannerPlacement })
  placement: BannerPlacement;

  @Column('varchar', { name: 'internal_name', length: 120 })
  internalName: string;

  @Column('varchar', { name: 'headline', length: 160, nullable: true })
  headline: string | null;

  @Column('varchar', { name: 'subheadline', length: 300, nullable: true })
  subheadline: string | null;

  @Column('varchar', { name: 'cta_label', length: 40, nullable: true })
  ctaLabel: string | null;

  @Column('varchar', { name: 'cta_url', length: 500, nullable: true })
  ctaUrl: string | null;

  @Column('int', { name: 'desktop_media_id' })
  desktopMediaId: number;

  @ManyToOne(() => MediaAsset, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'desktop_media_id',
    foreignKeyConstraintName: 'FK_banners_desktop_media',
  })
  desktopMedia?: MediaAsset;

  @Column('int', { name: 'mobile_media_id', nullable: true })
  mobileMediaId: number | null;

  @ManyToOne(() => MediaAsset, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'mobile_media_id',
    foreignKeyConstraintName: 'FK_banners_mobile_media',
  })
  mobileMedia?: MediaAsset | null;

  @Column('datetime', { name: 'starts_at', precision: 6, nullable: true })
  startsAt: Date | null;

  @Column('datetime', { name: 'ends_at', precision: 6, nullable: true })
  endsAt: Date | null;

  @Column('enum', { name: 'status', enum: ContentStatus, default: ContentStatus.Draft })
  status: ContentStatus;

  @Column('int', { name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}

@Entity('gallery_images')
@Index('IDX_gallery_images_public', ['organizationId', 'status', 'sortOrder'])
export class GalleryImage {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_gallery_images_organization',
  })
  organization?: Organization;

  @Column('int', { name: 'media_id' })
  mediaId: number;

  @ManyToOne(() => MediaAsset, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'media_id', foreignKeyConstraintName: 'FK_gallery_images_media' })
  media?: MediaAsset;

  @Column('varchar', { name: 'caption', length: 255, nullable: true })
  caption: string | null;

  @Column('varchar', { name: 'tag', length: 40, nullable: true })
  tag: string | null;

  @Column('enum', {
    name: 'status',
    enum: ContentStatus,
    default: ContentStatus.Published,
  })
  status: ContentStatus;

  @Column('int', { name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}

@Entity('testimonials')
@Index('IDX_testimonials_public', ['organizationId', 'status', 'sortOrder'])
export class Testimonial {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_testimonials_organization',
  })
  organization?: Organization;

  @Column('varchar', { name: 'author_name', length: 120 })
  authorName: string;

  @Column('varchar', { name: 'author_detail', length: 120, nullable: true })
  authorDetail: string | null;

  @Column('text', { name: 'quote' })
  quote: string;

  @Column('tinyint', { name: 'rating', unsigned: true, nullable: true })
  rating: number | null;

  @Column('varchar', { name: 'source', length: 40, nullable: true })
  source: string | null;

  @Column('int', { name: 'avatar_media_id', nullable: true })
  avatarMediaId: number | null;

  @ManyToOne(() => MediaAsset, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'avatar_media_id',
    foreignKeyConstraintName: 'FK_testimonials_avatar',
  })
  avatar?: MediaAsset | null;

  @Column('enum', { name: 'status', enum: ContentStatus, default: ContentStatus.Draft })
  status: ContentStatus;

  @Column('int', { name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}

@Entity('faqs')
@Index('IDX_faqs_public', ['organizationId', 'status', 'category', 'sortOrder'])
export class Faq {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_faqs_organization',
  })
  organization?: Organization;

  @Column('varchar', { name: 'category', length: 60, default: 'General' })
  category: string;

  @Column('varchar', { name: 'question', length: 255 })
  question: string;

  @Column('text', { name: 'answer' })
  answer: string;

  @Column('enum', { name: 'status', enum: ContentStatus, default: ContentStatus.Draft })
  status: ContentStatus;

  @Column('int', { name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}

/** About, privacy and terms. The body is the simple text format of ADR-020. */
@Entity('pages')
@Index('UQ_pages_organization_key', ['organizationId', 'pageKey'], { unique: true })
export class SitePage {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_pages_organization',
  })
  organization?: Organization;

  @Column('enum', { name: 'page_key', enum: PageKey })
  pageKey: PageKey;

  @Column('varchar', { name: 'title', length: 160 })
  title: string;

  @Column('mediumtext', { name: 'body' })
  body: string;

  @Column('int', { name: 'hero_media_id', nullable: true })
  heroMediaId: number | null;

  @ManyToOne(() => MediaAsset, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'hero_media_id',
    foreignKeyConstraintName: 'FK_pages_hero_media',
  })
  heroMedia?: MediaAsset | null;

  @Column('enum', { name: 'status', enum: ContentStatus, default: ContentStatus.Draft })
  status: ContentStatus;

  @Column('datetime', { name: 'published_at', precision: 6, nullable: true })
  publishedAt: Date | null;

  @Column('int', { name: 'updated_by_user_id', nullable: true })
  updatedByUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'updated_by_user_id',
    foreignKeyConstraintName: 'FK_pages_updated_by',
  })
  updatedBy?: User | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}

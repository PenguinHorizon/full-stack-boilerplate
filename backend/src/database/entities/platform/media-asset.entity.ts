import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MediaProvider } from '@common/constants/tenancy.enums';
import { User } from '../identity/user.entity';
import { Organization } from '../tenancy/organization.entity';

/**
 * An uploaded file owned by an organization (`organizationId` NULL = platform).
 *
 * Every reference to a media asset is an FK with ON DELETE RESTRICT, so the
 * database itself refuses to delete an asset that is still in use (ADR-012).
 */
@Entity('media_assets')
@Index('UQ_media_assets_provider_key', ['provider', 'storageKey'], { unique: true })
@Index('IDX_media_assets_organization_created', ['organizationId', 'createdAt'])
export class MediaAsset {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'organization_id', nullable: true })
  organizationId: number | null;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_media_assets_organization',
  })
  organization?: Organization | null;

  @Column('enum', { name: 'provider', enum: MediaProvider })
  provider: MediaProvider;

  @Column('varchar', { name: 'storage_key', length: 255 })
  storageKey: string;

  @Column('varchar', { name: 'url', length: 500 })
  url: string;

  @Column('varchar', { name: 'mime_type', length: 100 })
  mimeType: string;

  @Column('int', { name: 'size_bytes', unsigned: true })
  sizeBytes: number;

  @Column('smallint', { name: 'width', unsigned: true, nullable: true })
  width: number | null;

  @Column('smallint', { name: 'height', unsigned: true, nullable: true })
  height: number | null;

  @Column('varchar', { name: 'alt_text', length: 255, nullable: true })
  altText: string | null;

  @Column('varchar', { name: 'original_name', length: 255, nullable: true })
  originalName: string | null;

  @Column('int', { name: 'uploaded_by_user_id', nullable: true })
  uploadedByUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'uploaded_by_user_id',
    foreignKeyConstraintName: 'FK_media_assets_uploaded_by',
  })
  uploadedBy?: User | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 6 })
  createdAt: Date;
}

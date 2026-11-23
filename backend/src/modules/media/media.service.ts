import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { MediaProvider } from '@common/constants/tenancy.enums';
import { inspectImage } from '@common/domain/image';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { DomainException, FieldError } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes';
import { Page, pageWindow, toPage } from '@common/pagination/page';
import { StorageProvider } from '@common/ports/storage';
import { TenantContext } from '@common/tenancy/tenant-context';
import { escapeLike } from '@common/utils/sql';
import { MediaAsset } from '@database/entities/platform/media-asset.entity';
import {
  Banner,
  GalleryImage,
  SitePage,
  Testimonial,
} from '@database/entities/website/content.entity';
import { Organization } from '@database/entities/tenancy/organization.entity';
import { optimiseImage, UnreadableImageError } from './image-optimiser';
import { CloudinaryStorageProvider } from './storage/cloudinary-storage.provider';
import { LocalStorageProvider } from './storage/local-storage.provider';

export interface MediaRow {
  id: number;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  originalName: string | null;
  createdAt: Date;
}

export interface UploadedImage {
  buffer: Buffer;
  originalname: string;
  size: number;
}

/** Larger images are refused (and wouldn't fit `media_assets.width`). */
export const MAX_IMAGE_SIDE = 8000;
const MYSQL_ROW_IS_REFERENCED = 1451;

/**
 * The organization media library (ADR-012). Files are inspected by their bytes,
 * stored per organization, and referenced by id with RESTRICT foreign keys, so
 * an image in use cannot be deleted.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(MediaAsset) private readonly media: Repository<MediaAsset>,
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    private readonly config: ConfigService,
    private readonly local: LocalStorageProvider,
    private readonly cloudinary: CloudinaryStorageProvider,
  ) {}

  get maxImageBytes(): number {
    return Number(this.config.get('MEDIA_MAX_IMAGE_MB') ?? 5) * 1024 * 1024;
  }

  private storageFor(provider: MediaProvider): StorageProvider {
    return provider === MediaProvider.Cloudinary ? this.cloudinary : this.local;
  }

  private get uploadStorage(): StorageProvider {
    return this.storageFor(
      this.config.get('MEDIA_STORAGE') === 'cloudinary'
        ? MediaProvider.Cloudinary
        : MediaProvider.Local,
    );
  }

  async list(ctx: TenantContext, query: ListQueryDto): Promise<Page<MediaRow>> {
    const qb = this.media
      .createQueryBuilder('m')
      .where('m.organizationId = :orgId', { orgId: ctx.organizationId })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC');
    if (query.q) {
      qb.andWhere('(m.originalName LIKE :term OR m.altText LIKE :term)', {
        term: `%${escapeLike(query.q)}%`,
      });
    }
    const { skip, take } = pageWindow(query);
    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();
    return toPage(rows.map(toMediaRow), total, query);
  }

  async upload(
    ctx: TenantContext,
    file: UploadedImage | undefined,
    altText: string | null,
  ): Promise<MediaRow> {
    if (!file?.buffer?.length) {
      throw invalidFile('Choose an image to upload.');
    }
    if (file.size > this.maxImageBytes) {
      const mb = Math.round(this.maxImageBytes / 1024 / 1024);
      throw new DomainException(
        ErrorCode.PayloadTooLarge,
        `Images can be up to ${mb} MB.`,
        HttpStatus.PAYLOAD_TOO_LARGE,
        undefined,
        [{ field: 'file', message: `Images can be up to ${mb} MB` }],
      );
    }
    const info = inspectImage(file.buffer);
    if (!info) throw unsupportedImage();
    if ((info.width ?? 0) > MAX_IMAGE_SIDE || (info.height ?? 0) > MAX_IMAGE_SIDE) {
      throw invalidFile(`Images can be at most ${MAX_IMAGE_SIDE} pixels on each side.`);
    }
    // Upright, at most 2000 px and without EXIF/GPS (image-optimiser.ts).
    const image = await optimiseImage(file.buffer, info).catch((error: unknown) => {
      if (error instanceof UnreadableImageError) throw unsupportedImage();
      throw error;
    });

    const storage = this.uploadStorage;
    const stored = await storage.put({
      organizationId: ctx.organizationId,
      buffer: image.buffer,
      extension: info.extension,
      mimeType: info.mimeType,
    });
    try {
      const saved = await this.media.save(
        this.media.create({
          organizationId: ctx.organizationId,
          provider: stored.provider,
          storageKey: stored.storageKey,
          url: stored.url,
          mimeType: info.mimeType,
          sizeBytes: image.buffer.length,
          width: image.width,
          height: image.height,
          altText,
          originalName: cleanFileName(file.originalname),
          uploadedByUserId: ctx.userId,
        }),
      );
      return toMediaRow(saved);
    } catch (error) {
      // Don't leave an orphaned file behind a failed insert.
      await storage.remove(stored.storageKey).catch(() => undefined);
      throw error;
    }
  }

  async update(
    ctx: TenantContext,
    id: number,
    altText: string | null,
  ): Promise<MediaRow> {
    const asset = await this.findOwned(ctx, id);
    asset.altText = altText;
    return toMediaRow(await this.media.save(asset));
  }

  async remove(ctx: TenantContext, id: number): Promise<MediaAsset> {
    const asset = await this.findOwned(ctx, id);
    const usedAs = await this.usage(ctx.organizationId, id);
    if (usedAs.length) throw inUse(usedAs);

    try {
      await this.media.delete({ id, organizationId: ctx.organizationId });
    } catch (error) {
      // A reference this service doesn't know about yet (the FK is the guarantee).
      if (isRowReferenced(error)) throw inUse([]);
      throw error;
    }
    await this.storageFor(asset.provider)
      .remove(asset.storageKey)
      .catch((error: Error) =>
        this.logger.warn(`Deleted media ${id} but not its file: ${error.message}`),
      );
    return asset;
  }

  /**
   * INVALID_REFERENCE unless every given id is an image of this organization.
   * `null` (clearing a reference) is always fine.
   */
  async assertOwned(
    organizationId: number,
    refs: Array<{ field: string; id: number | null | undefined }>,
  ): Promise<void> {
    const ids = [
      ...new Set(refs.map((ref) => ref.id).filter((id): id is number => !!id)),
    ];
    if (ids.length === 0) return;
    const found = await this.media.find({
      select: { id: true },
      where: { id: In(ids), organizationId },
    });
    const owned = new Set(found.map((asset) => asset.id));
    const errors: FieldError[] = refs
      .filter((ref) => ref.id && !owned.has(ref.id))
      .map((ref) => ({
        field: ref.field,
        message: 'Choose an image from this organization’s library',
      }));
    if (errors.length) {
      throw new DomainException(
        ErrorCode.InvalidReference,
        'That image is not in this organization’s media library.',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        errors,
      );
    }
  }

  /** Where an image is used, in words, for the "in use" message. */
  private async usage(organizationId: number, id: number): Promise<string[]> {
    const usedAs: string[] = [];
    const organization = await this.organizations.findOneBy({ id: organizationId });
    if (organization?.logoMediaId === id) usedAs.push('the logo');
    if (organization?.coverMediaId === id) usedAs.push('the cover image');
    if (organization?.faviconMediaId === id) usedAs.push('the browser icon');

    // Website content. Add a lookup here for each new table that references media.
    const manager = this.media.manager;
    const [banners, gallery, testimonials, pages] = await Promise.all([
      manager
        .createQueryBuilder(Banner, 'b')
        .where('b.organizationId = :organizationId', { organizationId })
        .andWhere('(b.desktopMediaId = :id OR b.mobileMediaId = :id)', { id })
        .getMany(),
      manager.count(GalleryImage, { where: { organizationId, mediaId: id } }),
      manager.find(Testimonial, { where: { organizationId, avatarMediaId: id } }),
      manager.find(SitePage, { where: { organizationId, heroMediaId: id } }),
    ]);
    for (const banner of banners) usedAs.push(`the “${banner.internalName}” banner`);
    if (gallery) usedAs.push('the gallery');
    for (const testimonial of testimonials) {
      usedAs.push(`${testimonial.authorName}’s testimonial`);
    }
    for (const page of pages) usedAs.push(`the ${page.pageKey} page`);
    return usedAs;
  }

  private async findOwned(ctx: TenantContext, id: number): Promise<MediaAsset> {
    const asset = await this.media.findOneBy({
      id,
      organizationId: ctx.organizationId,
    });
    if (!asset) throw new NotFoundException('Image not found');
    return asset;
  }
}

export function toMediaRow(asset: MediaAsset): MediaRow {
  return {
    id: asset.id,
    url: asset.url,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
    altText: asset.altText,
    originalName: asset.originalName,
    createdAt: asset.createdAt,
  };
}

/** Keeps the base name only, without control characters, within the column. */
export function cleanFileName(name: string): string | null {
  const base = [...(name.split(/[\\/]/).pop() ?? '')]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('')
    .trim();
  return base ? base.slice(0, 255) : null;
}

function unsupportedImage() {
  return new DomainException(
    ErrorCode.UnsupportedMedia,
    'That file is not a supported image. Use JPG, PNG, WebP, AVIF or GIF.',
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    undefined,
    [{ field: 'file', message: 'Use a JPG, PNG, WebP, AVIF or GIF image' }],
  );
}

function invalidFile(message: string) {
  return new DomainException(
    ErrorCode.ValidationFailed,
    message,
    HttpStatus.BAD_REQUEST,
    undefined,
    [{ field: 'file', message }],
  );
}

function inUse(usedAs: string[]) {
  const where = usedAs.length ? ` as ${joinWords(usedAs)}` : '';
  return new DomainException(
    ErrorCode.MediaInUse,
    `This image is in use${where}. Replace it there first.`,
    HttpStatus.CONFLICT,
    { usedAs },
  );
}

function joinWords(words: string[]): string {
  return words.length < 2
    ? (words[0] ?? '')
    : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

function isRowReferenced(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { errno?: number } | undefined)?.errno ===
      MYSQL_ROW_IS_REFERENCED
  );
}

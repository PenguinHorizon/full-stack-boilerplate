import sharp from 'sharp';
import type { ImageInfo } from '@common/domain/image';

/*
 * Uploads are re-encoded before they are stored: phone photos
 * arrive at 4000+ px and several MB, and carry EXIF (including GPS).
 *
 * - Turned upright from the EXIF orientation, then fitted inside
 *   DELIVERED_IMAGE_SIDE (never enlarged). That is enough for a full-width
 *   hero; cards and thumbnails are scaled by the browser.
 * - Re-encoded in the same format, so URLs, MIME types and transparency
 *   stay as uploaded. Metadata is not copied.
 * - Animated images (GIF, animated WebP/AVIF) are stored as uploaded:
 *   re-encoding would keep only the first frame.
 * - A re-encode that comes out larger is discarded unless it was needed
 *   (resized, or metadata/orientation to remove).
 */

/** Longest side of a stored image, in pixels. */
export const DELIVERED_IMAGE_SIDE = 2000;

// A server handles unrelated uploads: libvips' operation cache only holds memory.
sharp.cache(false);

export interface OptimisedImage {
  buffer: Buffer;
  width: number | null;
  height: number | null;
}

/** The image could not be decoded (corrupt, truncated or not really an image). */
export class UnreadableImageError extends Error {
  constructor(readonly reason: unknown) {
    super('Image could not be decoded');
  }
}

export async function optimiseImage(
  buffer: Buffer,
  info: ImageInfo,
): Promise<OptimisedImage> {
  const original = { buffer, width: info.width, height: info.height };
  if (info.mimeType === 'image/gif') return original;

  try {
    // `failOn: 'error'`: camera files with harmless warnings still upload.
    const input = () => sharp(buffer, { failOn: 'error' });
    const meta = await input().metadata();
    if ((meta.pages ?? 1) > 1) return original;

    const pipeline = input().autoOrient().resize({
      width: DELIVERED_IMAGE_SIDE,
      height: DELIVERED_IMAGE_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    });
    switch (info.mimeType) {
      case 'image/jpeg':
        pipeline.jpeg({ quality: 82, mozjpeg: true });
        break;
      case 'image/png':
        pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
        break;
      case 'image/webp':
        pipeline.webp({ quality: 82 });
        break;
      case 'image/avif':
        pipeline.avif({ quality: 55, effort: 4 });
        break;
    }
    const { data, info: out } = await pipeline.toBuffer({ resolveWithObject: true });

    const resized = Math.max(meta.width ?? 0, meta.height ?? 0) > DELIVERED_IMAGE_SIDE;
    const strip =
      Boolean(meta.exif || meta.xmp || meta.iptc) || (meta.orientation ?? 1) !== 1;
    if (!resized && !strip && data.length >= buffer.length) return original;
    return { buffer: data, width: out.width, height: out.height };
  } catch (error) {
    throw new UnreadableImageError(error);
  }
}

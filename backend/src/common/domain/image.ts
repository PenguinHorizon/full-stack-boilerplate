/*
 * Identifies an uploaded image from its bytes (the client's MIME type and
 * file name are not evidence) and reads its pixel size from the header.
 *
 * SVG is deliberately unsupported: uploads are served from the API's own
 * origin, and an SVG can carry script (stored XSS).
 */

export interface ImageInfo {
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/avif';
  extension: 'jpg' | 'png' | 'gif' | 'webp' | 'avif';
  /** null when the header doesn't say (never for the formats below in practice). */
  width: number | null;
  height: number | null;
}

const ascii = (buffer: Buffer, start: number, length: number) =>
  buffer.toString('latin1', start, start + length);

function png(buffer: Buffer): ImageInfo | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((byte, index) => buffer[index] === byte)) return null;
  const hasHeader = buffer.length >= 24 && ascii(buffer, 12, 4) === 'IHDR';
  return {
    mimeType: 'image/png',
    extension: 'png',
    width: hasHeader ? buffer.readUInt32BE(16) : null,
    height: hasHeader ? buffer.readUInt32BE(20) : null,
  };
}

function gif(buffer: Buffer): ImageInfo | null {
  const header = ascii(buffer, 0, 6);
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;
  const sized = buffer.length >= 10;
  return {
    mimeType: 'image/gif',
    extension: 'gif',
    width: sized ? buffer.readUInt16LE(6) : null,
    height: sized ? buffer.readUInt16LE(8) : null,
  };
}

function webp(buffer: Buffer): ImageInfo | null {
  if (ascii(buffer, 0, 4) !== 'RIFF' || ascii(buffer, 8, 4) !== 'WEBP') return null;
  let width: number | null = null;
  let height: number | null = null;
  const chunk = ascii(buffer, 12, 4);
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    width = buffer.readUInt16LE(26) & 0x3fff;
    height = buffer.readUInt16LE(28) & 0x3fff;
  } else if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    width = 1 + (((buffer[22] & 0x3f) << 8) | buffer[21]);
    height =
      1 +
      (((buffer[24] & 0x0f) << 10) | (buffer[23] << 2) | ((buffer[22] & 0xc0) >> 6));
  } else if (chunk === 'VP8X' && buffer.length >= 30) {
    width = 1 + buffer.readUIntLE(24, 3);
    height = 1 + buffer.readUIntLE(27, 3);
  }
  return { mimeType: 'image/webp', extension: 'webp', width, height };
}

/** Start-of-frame markers carry the size; C4, C8 and CC are other segments. */
const SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpeg(buffer: Buffer): ImageInfo | null {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2; // standalone markers carry no length
      continue;
    }
    if (SOF.has(marker)) {
      return {
        mimeType: 'image/jpeg',
        extension: 'jpg',
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return { mimeType: 'image/jpeg', extension: 'jpg', width: null, height: null };
}

function avif(buffer: Buffer): ImageInfo | null {
  if (buffer.length < 16 || ascii(buffer, 4, 4) !== 'ftyp') return null;
  const boxSize = Math.min(buffer.readUInt32BE(0), buffer.length);
  const brands: string[] = [ascii(buffer, 8, 4)];
  for (let offset = 16; offset + 4 <= boxSize; offset += 4)
    brands.push(ascii(buffer, offset, 4));
  if (!brands.includes('avif') && !brands.includes('avis')) return null;

  // The image spatial extent box ("ispe") holds the primary image size.
  const ispe = buffer.indexOf('ispe', 0, 'latin1');
  const sized = ispe > 0 && ispe + 16 <= buffer.length;
  return {
    mimeType: 'image/avif',
    extension: 'avif',
    width: sized ? buffer.readUInt32BE(ispe + 8) : null,
    height: sized ? buffer.readUInt32BE(ispe + 12) : null,
  };
}

/** The image type and size, or null if the bytes are not a supported image. */
export function inspectImage(buffer: Buffer): ImageInfo | null {
  return png(buffer) ?? jpeg(buffer) ?? webp(buffer) ?? gif(buffer) ?? avif(buffer);
}

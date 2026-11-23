import sharp from 'sharp';
import { inspectImage } from '@common/domain/image';
import {
  DELIVERED_IMAGE_SIDE,
  optimiseImage,
  UnreadableImageError,
} from './image-optimiser';

const solid = (width: number, height: number, channels: 3 | 4 = 3) =>
  sharp({
    create: {
      width,
      height,
      channels,
      background: { r: 200, g: 120, b: 40, alpha: 0.5 },
    },
  });

async function optimise(buffer: Buffer) {
  const info = inspectImage(buffer);
  if (!info) throw new Error('fixture is not an image');
  return optimiseImage(buffer, info);
}

describe('optimiseImage', () => {
  it('turns a phone photo upright, fits it inside the limit and drops EXIF/GPS', async () => {
    const photo = await solid(4032, 3024)
      .jpeg({ quality: 95 })
      .withExif({ IFD0: { Make: 'Phone' }, IFD3: { GPSLatitudeRef: 'N' } })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(photo).metadata()).exif).toBeDefined();

    const result = await optimise(photo);

    expect(result).toMatchObject({ width: 1500, height: DELIVERED_IMAGE_SIDE });
    const meta = await sharp(result.buffer).metadata();
    expect(meta).toMatchObject({ format: 'jpeg', width: 1500, height: 2000 });
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect(result.buffer.length).toBeLessThan(photo.length);
  });

  it('keeps the format and transparency, and never enlarges', async () => {
    const logo = await solid(300, 120, 4).png({ compressionLevel: 0 }).toBuffer();
    const result = await optimise(logo);
    const meta = await sharp(result.buffer).metadata();
    expect(meta).toMatchObject({
      format: 'png',
      width: 300,
      height: 120,
      hasAlpha: true,
    });
    expect(result.buffer.length).toBeLessThan(logo.length);
  });

  it('re-encodes heavy files that are already small enough', async () => {
    const pixels = Buffer.alloc(600 * 400 * 3);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 7919) % 251;
    const heavy = await sharp(pixels, { raw: { width: 600, height: 400, channels: 3 } })
      .jpeg({ quality: 100 })
      .toBuffer();
    const result = await optimise(heavy);
    expect(result).toMatchObject({ width: 600, height: 400 });
    expect(result.buffer.length).toBeLessThan(heavy.length);
    expect((await sharp(result.buffer).metadata()).format).toBe('jpeg');
  });

  it('stores the upload as-is when re-encoding would only make it bigger', async () => {
    const tiny = await solid(1, 1).png().toBuffer();
    const result = await optimise(tiny);
    expect(result.buffer).toBe(tiny);
    expect(result).toMatchObject({ width: 1, height: 1 });
  });

  it('leaves GIFs and animations alone (re-encoding keeps one frame)', async () => {
    const gif = await solid(2400, 10).gif().toBuffer();
    expect((await optimise(gif)).buffer).toBe(gif);

    const frame = (r: number) =>
      sharp({
        create: { width: 2400, height: 10, channels: 3, background: { r, g: 0, b: 0 } },
      })
        .png()
        .toBuffer();
    const animated = await sharp([await frame(0), await frame(255)], {
      join: { animated: true },
    })
      .webp()
      .toBuffer();
    expect((await sharp(animated).metadata()).pages).toBe(2);
    expect((await optimise(animated)).buffer).toBe(animated);
  });

  it('refuses bytes that only look like an image', async () => {
    const real = await solid(64, 64).jpeg().toBuffer();
    // A genuine header (so the byte sniffer accepts it) with the image data cut off.
    const fake = Buffer.concat([real.subarray(0, 200), Buffer.alloc(64, 0x41)]);
    expect(inspectImage(fake)?.mimeType).toBe('image/jpeg');
    await expect(optimise(fake)).rejects.toBeInstanceOf(UnreadableImageError);
  });
});

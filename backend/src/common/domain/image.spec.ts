import { inspectImage } from './image';

/* Minimal headers, enough for type and size detection. */

function png(width: number, height: number) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'latin1');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function jpeg(width: number, height: number) {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    // APP0 segment (length 16) to skip over.
    Buffer.from([0xff, 0xe0, 0x00, 0x10]),
    Buffer.alloc(14),
    // SOF0: length, precision, height, width.
    Buffer.from([
      0xff,
      0xc0,
      0x00,
      0x11,
      0x08,
      height >> 8,
      height & 0xff,
      width >> 8,
      width & 0xff,
    ]),
    Buffer.alloc(12),
  ]);
}

function gif(width: number, height: number) {
  const buffer = Buffer.alloc(13);
  buffer.write('GIF89a', 0, 'latin1');
  buffer.writeUInt16LE(width, 6);
  buffer.writeUInt16LE(height, 8);
  return buffer;
}

function webpVp8x(width: number, height: number) {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'latin1');
  buffer.writeUInt32LE(22, 4);
  buffer.write('WEBP', 8, 'latin1');
  buffer.write('VP8X', 12, 'latin1');
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}

function webpLossy(width: number, height: number) {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'latin1');
  buffer.write('WEBP', 8, 'latin1');
  buffer.write('VP8 ', 12, 'latin1');
  Buffer.from([0x9d, 0x01, 0x2a]).copy(buffer, 23);
  buffer.writeUInt16LE(width, 26);
  buffer.writeUInt16LE(height, 28);
  return buffer;
}

function avif(width: number, height: number) {
  const ftyp = Buffer.alloc(24);
  ftyp.writeUInt32BE(24, 0);
  ftyp.write('ftypavif', 4, 'latin1');
  ftyp.write('mif1miaf', 16, 'latin1');
  const ispe = Buffer.alloc(20);
  ispe.writeUInt32BE(20, 0);
  ispe.write('ispe', 4, 'latin1');
  ispe.writeUInt32BE(width, 12);
  ispe.writeUInt32BE(height, 16);
  return Buffer.concat([ftyp, Buffer.alloc(8), ispe]);
}

describe('inspectImage', () => {
  it.each([
    ['PNG', png(640, 480), 'image/png', 'png'],
    ['JPEG', jpeg(1200, 800), 'image/jpeg', 'jpg'],
    ['GIF', gif(32, 16), 'image/gif', 'gif'],
    ['WebP (extended)', webpVp8x(1920, 1080), 'image/webp', 'webp'],
    ['WebP (lossy)', webpLossy(300, 200), 'image/webp', 'webp'],
    ['AVIF', avif(1024, 768), 'image/avif', 'avif'],
  ])('reads %s', (_name, buffer, mimeType, extension) => {
    const info = inspectImage(buffer);
    expect(info).toEqual(expect.objectContaining({ mimeType, extension }));
    expect(info?.width).toBeGreaterThan(0);
  });

  it('reads the pixel size', () => {
    expect(inspectImage(png(640, 480))).toMatchObject({ width: 640, height: 480 });
    expect(inspectImage(jpeg(1200, 800))).toMatchObject({ width: 1200, height: 800 });
    expect(inspectImage(webpVp8x(1920, 1080))).toMatchObject({
      width: 1920,
      height: 1080,
    });
    expect(inspectImage(avif(1024, 768))).toMatchObject({ width: 1024, height: 768 });
  });

  it.each([
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')],
    ['HTML', Buffer.from('<!doctype html><script>alert(1)</script>')],
    ['PDF', Buffer.from('%PDF-1.7\n')],
    ['empty', Buffer.alloc(0)],
    [
      'MP4 (ftyp without an image brand)',
      Buffer.concat([
        Buffer.from([0, 0, 0, 24]),
        Buffer.from('ftypisom0000mp41avc1', 'latin1'),
      ]),
    ],
  ])('rejects %s', (_name, buffer) => {
    expect(inspectImage(buffer)).toBeNull();
  });
});

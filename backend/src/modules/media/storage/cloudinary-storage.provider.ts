import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import { Readable } from 'node:stream';
import { MediaProvider } from '@common/constants/tenancy.enums';
import { StorageProvider, StoreInput, StoredObject } from '@common/ports/storage';

/** Cloudinary, one folder per organization (`r/{organizationId}`). */
@Injectable()
export class CloudinaryStorageProvider implements StorageProvider {
  readonly provider = MediaProvider.Cloudinary;
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    this.configured = Boolean(config.get('CLOUDINARY_CLOUD_NAME'));
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  put({ organizationId, buffer }: StoreInput): Promise<StoredObject> {
    this.assertConfigured();
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: `r/${organizationId}`, resource_type: 'image' },
        (error: UploadApiErrorResponse | undefined, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(new ServiceUnavailableException('The image service is unavailable'));
            return;
          }
          resolve({
            provider: this.provider,
            storageKey: result.public_id,
            url: result.secure_url,
          });
        },
      );
      Readable.from(buffer).pipe(upload);
    });
  }

  async remove(storageKey: string): Promise<void> {
    if (!this.configured) return;
    await cloudinary.uploader.destroy(storageKey, { resource_type: 'image' });
  }

  private assertConfigured() {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'MEDIA_STORAGE is "cloudinary" but CLOUDINARY_CLOUD_NAME is not set',
      );
    }
  }
}

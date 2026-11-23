import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { MediaProvider } from '@common/constants/tenancy.enums';
import { StorageProvider, StoreInput, StoredObject } from '@common/ports/storage';
import { uploadRoot } from '../../../utils/upload-storage';

/**
 * Files under `{UPLOAD_DIR}/r/{organizationId}/{uuid}.{ext}`, served by the API
 * at `/uploads/...` with hardening headers (app.module.ts).
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  readonly provider = MediaProvider.Local;

  async put({ organizationId, buffer, extension }: StoreInput): Promise<StoredObject> {
    const storageKey = `r/${organizationId}/${randomUUID()}.${extension}`;
    const path = this.pathFor(storageKey);
    await fs.mkdir(dirname(path), { recursive: true });
    // `wx`: never overwrite (a UUID collision would be a bug, not a replace).
    await fs.writeFile(path, buffer, { flag: 'wx' });
    return { provider: this.provider, storageKey, url: `/uploads/${storageKey}` };
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await fs.unlink(this.pathFor(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  /** Resolves inside the upload root only (a stored key is never trusted blindly). */
  private pathFor(storageKey: string): string {
    const root = uploadRoot();
    const path = resolve(root, storageKey);
    const inside = relative(root, path);
    if (!inside || inside.startsWith('..') || inside.includes(`..${sep}`)) {
      throw new Error(`Storage key escapes the upload root: ${storageKey}`);
    }
    return path;
  }
}

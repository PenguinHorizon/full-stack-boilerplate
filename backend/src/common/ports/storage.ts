import { MediaProvider } from '@common/constants/tenancy.enums';

/*
 * Storage port. Media services talk to
 * this interface; adding S3 later is a new class, not a refactor.
 */

export interface StoreInput {
  /** Owner of the file; decides the folder (`r/{organizationId}`). */
  organizationId: number;
  buffer: Buffer;
  /** Lower-case extension without the dot, from the inspected bytes. */
  extension: string;
  mimeType: string;
}

export interface StoredObject {
  provider: MediaProvider;
  /** Local relative path or Cloudinary public_id. */
  storageKey: string;
  /** What browsers load. Local files are same-origin (`/uploads/...`). */
  url: string;
}

export interface StorageProvider {
  readonly provider: MediaProvider;
  put(input: StoreInput): Promise<StoredObject>;
  /** Best effort: a missing object is not an error. */
  remove(storageKey: string): Promise<void>;
}

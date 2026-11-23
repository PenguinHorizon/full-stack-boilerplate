import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/*
 * Runs before each e2e file is loaded (jest `setupFiles`), so AppModule's
 * static-file root and the local storage provider both use a throwaway
 * folder instead of backend/uploads.
 */
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'app-e2e-uploads-'));

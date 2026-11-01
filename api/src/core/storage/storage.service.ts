import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PUBLIC_PREFIX, STORAGE_PROVIDER, SignedUrlOptions, StorageProvider } from './interfaces/storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  get providerName() {
    return this.provider.name;
  }

  get bucket() {
    return this.provider.bucket;
  }

  /** orgs/{org}/{scope}/{uuid}/{safe-filename} */
  buildKey(organizationId: string, scope: string, filename: string): string {
    const safe = filename.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_').slice(-120) || 'file';
    return `orgs/${organizationId}/${scope}/${randomUUID()}/${safe}`;
  }

  /** public/orgs/{org}/{scope}/{uuid}/{safe-filename} — world-readable. */
  buildPublicKey(organizationId: string, scope: string, filename: string): string {
    return `${PUBLIC_PREFIX}${this.buildKey(organizationId, scope, filename)}`;
  }

  publicUrl(key: string) {
    return this.provider.publicUrl(key);
  }

  put(key: string, data: Buffer, contentType: string) {
    return this.provider.put(key, data, contentType);
  }

  get(key: string) {
    return this.provider.get(key);
  }

  delete(key: string) {
    return this.provider.delete(key);
  }

  /**
   * Best-effort removal of many objects (idempotent: missing objects are ignored). Failures are
   * logged, never thrown, so a storage hiccup cannot undo an already-committed DB deletion.
   */
  async deleteMany(keys: Array<string | null | undefined>): Promise<void> {
    const unique = Array.from(new Set(keys.filter((k): k is string => !!k)));
    const results = await Promise.allSettled(unique.map((key) => this.provider.delete(key)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') this.logger.warn(`Could not delete "${unique[i]}": ${r.reason?.message ?? r.reason}`);
    });
  }

  exists(key: string) {
    return this.provider.exists(key);
  }

  /** Short-lived signed URL (default 5 minutes). */
  signedUrl(key: string, options?: SignedUrlOptions) {
    return this.provider.signedUrl(key, { expiresInSeconds: 300, ...options });
  }
}

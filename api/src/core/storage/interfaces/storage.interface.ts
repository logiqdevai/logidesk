export interface SignedUrlOptions {
  expiresInSeconds?: number;
  /** Suggested filename for the browser. */
  filename?: string;
  /** "inline" for previews, "attachment" for downloads. */
  disposition?: 'inline' | 'attachment';
  contentType?: string;
}

/** Private object storage. Implementations must never expose objects publicly. */
export interface StorageProvider {
  readonly name: string;
  readonly bucket: string | null;
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  signedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  /** Permanent, unsigned URL. Only meaningful for keys under `PUBLIC_PREFIX`. */
  publicUrl(key: string): string;
}

/** Objects under this key prefix are world-readable (e.g. workspace logos). Everything else stays private. */
export const PUBLIC_PREFIX = 'public/';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

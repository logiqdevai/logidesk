import { Storage } from '@google-cloud/storage';
import { SignedUrlOptions, StorageProvider } from '../interfaces/storage.interface';

/** Google Cloud Storage (private bucket, V4 signed URLs). */
export class GcsStorageProvider implements StorageProvider {
  readonly name = 'gcs';
  private readonly storage: Storage;

  constructor(
    readonly bucket: string,
    projectId: string,
    credentials?: object,
  ) {
    this.storage = new Storage({ projectId, ...(credentials ? { credentials } : {}) });
  }

  private file(key: string) {
    return this.storage.bucket(this.bucket).file(key);
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    // No per-object ACL: the bucket uses uniform bucket-level access, where objects are private unless IAM says otherwise.
    await this.file(key).save(data, { contentType, resumable: false });
  }

  async get(key: string): Promise<Buffer> {
    const [buffer] = await this.file(key).download();
    return buffer;
  }

  async delete(key: string): Promise<void> {
    await this.file(key).delete({ ignoreNotFound: true });
  }

  async exists(key: string): Promise<boolean> {
    const [exists] = await this.file(key).exists();
    return exists;
  }

  async signedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    const filename = (options.filename ?? key.split('/').pop()).replace(/"/g, '');
    const [url] = await this.file(key).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + (options.expiresInSeconds ?? 300) * 1000,
      responseDisposition: `${options.disposition ?? 'attachment'}; filename="${filename}"`,
      responseType: options.contentType,
    });
    return url;
  }
}

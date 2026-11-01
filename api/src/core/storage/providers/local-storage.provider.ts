import { promises as fs } from 'fs';
import { dirname, resolve, sep } from 'path';
import { JwtService } from '@nestjs/jwt';
import { SignedUrlOptions, StorageProvider } from '../interfaces/storage.interface';

/**
 * Filesystem storage for development and single-node deployments. Files live in a private
 * directory that is never served statically; access goes through short-lived signed tokens
 * verified by the API (`GET /files/signed`).
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';
  readonly bucket = null;
  private readonly root: string;

  constructor(
    root: string,
    private readonly apiUrl: string,
    private readonly jwt: JwtService,
    private readonly secret: string,
  ) {
    this.root = resolve(root);
  }

  private path(key: string): string {
    const full = resolve(this.root, key);
    if (!full.startsWith(this.root + sep)) throw new Error('Invalid storage key');
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.path(key);
    await fs.mkdir(dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.path(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.path(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.path(key));
      return true;
    } catch {
      return false;
    }
  }

  publicUrl(key: string): string {
    return `${this.apiUrl}/files/public/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async signedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    const token = await this.jwt.signAsync(
      {
        k: key,
        f: options.filename ?? key.split('/').pop(),
        d: options.disposition ?? 'attachment',
        t: options.contentType ?? 'application/octet-stream',
        typ: 'file',
      },
      { secret: this.secret, expiresIn: options.expiresInSeconds ?? 300 },
    );
    return `${this.apiUrl}/files/signed?token=${encodeURIComponent(token)}`;
  }

  async verify(token: string): Promise<{ key: string; filename: string; disposition: string; contentType: string }> {
    const payload = await this.jwt.verifyAsync(token, { secret: this.secret });
    if (payload.typ !== 'file') throw new Error('Invalid token');
    return { key: payload.k, filename: payload.f, disposition: payload.d, contentType: payload.t };
  }
}

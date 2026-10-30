import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** URL-safe random token (used for invitations, password resets, refresh tokens). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Unguessable short slug, e.g. for public portal links. */
export function generateSlug(bytes = 9): string {
  return randomBytes(bytes).toString('base64url').replace(/[-_]/g, 'x').toLowerCase();
}

/** AES-256-GCM encryption for integration secrets stored at rest. */
export function encryptSecret(plain: string, key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64')).join('.');
}

export function decryptSecret(payload: string, key: string): string {
  const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

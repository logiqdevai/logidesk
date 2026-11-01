import { Controller, Get, Inject, NotFoundException, Param, Query, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { PUBLIC_PREFIX, STORAGE_PROVIDER, StorageProvider } from './interfaces/storage.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';

/** Serves files for the local storage provider through short-lived signed tokens. */
@ApiExcludeController()
@Controller('files')
export class StorageController {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider,
    private readonly config: ConfigService,
  ) {}

  /** Local-provider equivalent of a public bucket prefix; only `public/` keys are served. */
  @Get('public/*key')
  async publicFile(@Param('key') keyParts: string | string[], @Res() res: Response) {
    if (!(this.provider instanceof LocalStorageProvider)) throw new NotFoundException();
    const key = PUBLIC_PREFIX + (Array.isArray(keyParts) ? keyParts.join('/') : keyParts);
    if (!(await this.provider.exists(key))) throw new NotFoundException('File not found');
    const ext = key.split('.').pop()?.toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(await this.provider.get(key));
  }

  @Get('signed')
  async signed(@Query('token') token: string, @Res() res: Response) {
    if (!(this.provider instanceof LocalStorageProvider)) throw new NotFoundException();
    let file: Awaited<ReturnType<LocalStorageProvider['verify']>>;
    try {
      file = await this.provider.verify(token);
    } catch {
      throw new UnauthorizedException('This link has expired');
    }
    if (!(await this.provider.exists(file.key))) throw new NotFoundException('File not found');
    const data = await this.provider.get(file.key);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `${file.disposition === 'inline' ? 'inline' : 'attachment'}; filename="${encodeURIComponent(file.filename)}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Inline previews are embedded by the web app (a different origin than the API).
    res.removeHeader('X-Frame-Options');
    const appUrl = (this.config.get<string>('APP_URL') || '').replace(/\/$/, '');
    res.setHeader('Content-Security-Policy', `default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self' ${appUrl}`);
    res.send(data);
  }
}

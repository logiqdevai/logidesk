import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { STORAGE_PROVIDER, StorageProvider } from './interfaces/storage.interface';
import { GcsStorageProvider } from './providers/gcs-storage.provider';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, JwtService],
      useFactory: (config: ConfigService, jwt: JwtService): StorageProvider => {
        const logger = new Logger('StorageModule');
        const bucket = config.get<string>('GCS_BUCKET_NAME');
        const projectId = config.get<string>('GCS_PROJECT_ID');
        if (bucket && projectId) {
          const b64 = config.get<string>('GCS_CREDENTIALS_JSON_BASE64');
          const raw = config.get<string>('GCS_CREDENTIALS');
          const credentials = b64
            ? JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
            : raw
              ? JSON.parse(raw)
              : undefined;
          logger.log(`Using Google Cloud Storage bucket "${bucket}"`);
          return new GcsStorageProvider(bucket, projectId, credentials);
        }
        if (config.get('NODE_ENV') === 'production' && !config.get('STORAGE_LOCAL_DIR')) {
          throw new Error('GCS_BUCKET_NAME/GCS_PROJECT_ID (or STORAGE_LOCAL_DIR) must be configured in production');
        }
        const dir = config.get<string>('STORAGE_LOCAL_DIR') || '.storage';
        logger.warn(`GCS not configured — using private local storage at "${dir}"`);
        return new LocalStorageProvider(
          dir,
          (config.get<string>('API_URL') || 'http://localhost:3000').replace(/\/$/, ''),
          jwt,
          `${config.get('JWT_SECRET')}:files`,
        );
      },
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}

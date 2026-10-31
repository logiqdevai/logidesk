import { NestFactory } from '@nestjs/core';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionI18nFilter } from './shared/i18n/http-exception-i18n.filter';
import { parseCorsUrls, resolveCorsOrigins } from './shared/config/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.setGlobalPrefix('api', { exclude: ['admin/queues', 'admin/queues/(.*)'] });

  app.useGlobalFilters(new HttpExceptionI18nFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const fieldErrors: Record<string, string> = {};
        const walk = (list: typeof errors, prefix = '') => {
          for (const e of list) {
            const key = prefix ? `${prefix}.${e.property}` : e.property;
            if (e.constraints) fieldErrors[key] = Object.values(e.constraints)[0];
            if (e.children?.length) walk(e.children, key);
          }
        };
        walk(errors);
        const first = Object.values(fieldErrors)[0] ?? 'Validation failed';
        return new BadRequestException({ message: first, errors: fieldErrors });
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('LogiDesk API')
    .setDescription('Multi-tenant document collection & client portal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const corsOrigins = resolveCorsOrigins({
    nodeEnv: process.env.NODE_ENV,
    corsUrls: parseCorsUrls(process.env.CORS_URLS),
    appUrl: process.env.APP_URL,
    landingUrl: process.env.LANDING_URL,
  });
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept-Language'],
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`API listening on :${port} (docs at /api/docs)`);
}
bootstrap();

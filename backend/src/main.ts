import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { API_PREFIX, API_VERSION, configureApp } from './app.setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  configureApp(app);

  app.use(
    helmet({
      // /uploads/* may be fetched from another origin in development.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Swagger UI is inline-script heavy; helmet's default CSP blanks it out.
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  // Explicit, and ordered ahead of the router because `bodyParser: false`.
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  /*
   * Browsers normally reach the API same-origin through the reverse proxy (or
   * the Vite dev proxy), so CORS only matters for tools or split-origin
   * deployments. Credentials mode requires an explicit allow-list.
   */
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Tourism Platform API')
      .setDescription(
        'Multi-tenant tourism platform API. Routes are versioned under /api/v1 ' +
          '(health is version-neutral).',
      )
      .setVersion(API_VERSION)
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();

    SwaggerModule.setup(
      `${API_PREFIX}/docs`,
      app,
      SwaggerModule.createDocument(app, config),
      { swaggerOptions: { persistAuthorization: true } },
    );
  }

  // Lets TypeORM close its pool and in-flight requests drain on SIGTERM.
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3003;
  await app.listen(port, '0.0.0.0');

  logger.log(`API listening on http://localhost:${port}/${API_PREFIX}/v${API_VERSION}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger UI at http://localhost:${port}/${API_PREFIX}/docs`);
  }
}

void bootstrap();

process.on('unhandledRejection', (reason) => {
  Logger.error(`Unhandled rejection: ${reason}`, undefined, 'Process');
});

process.on('uncaughtException', (error) => {
  // The process state is undefined after this point; exit and let the
  // supervisor restart rather than serving traffic from a broken runtime.
  Logger.error(`Uncaught exception: ${error.message}`, error.stack, 'Process');
  process.exit(1);
});

import {
  ClassSerializerInterceptor,
  HttpStatus,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ServerResponse } from 'http';
import { extname } from 'path';

import { validateEnv } from '@common/config/env.validation';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { LoggerMiddleware } from '@common/middlewares/logger.middleware';
import { RequestIdMiddleware } from '@common/middlewares/request-id.middleware';
import { validationExceptionFactory } from '@common/errors/validation.factory';
import { DatabaseModule } from '@database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { UsersModule } from '@modules/users/users.module';
import { AccessModule } from '@modules/access/access.module';
import { TenantGuard } from '@modules/access/guards/tenant.guard';
import { PermissionsGuard } from '@modules/access/guards/permissions.guard';
import { SettingsModule } from '@modules/settings/settings.module';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { MediaModule } from '@modules/media/media.module';
import { DashboardModule } from '@modules/dashboard/dashboard.module';
import { HealthModule } from '@modules/health/health.module';
import { MailModule } from '@modules/mail/mail.module';
import { uploadRoot } from './utils/upload-storage';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { PublicModule } from '@modules/public/public.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { ContentModule } from '@modules/content/content.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

const INLINE_SAFE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.avif',
]);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // Fails the boot on a missing/placeholder secret rather than at runtime.
      validate: validateEnv,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),

    ServeStaticModule.forRoot({
      rootPath: uploadRoot(),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        // Files are written once under a fresh UUID and never overwritten
        // (LocalStorageProvider), and one in use cannot be deleted.
        maxAge: '365d',
        immutable: true,
        setHeaders: (res: ServerResponse, path: string) => {
          res.setHeader('X-Content-Type-Options', 'nosniff');
          // Anything that isn't a known-safe image is downloaded, not rendered
          // in the API's own origin.
          if (!INLINE_SAFE_EXTENSIONS.has(extname(path).toLowerCase())) {
            res.setHeader('Content-Disposition', 'attachment');
          }
        },
      },
    }),

    /*
     * `skipIf` is checked before the per-route `@Throttle()` metadata, so it is
     * the only switch that can also lift the tighter limit on the auth routes.
     * That makes it exactly what the functional e2e specs need — they fire far
     * more than 5 auth requests inside the window — and exactly what must never
     * be reachable in production. Hence the NODE_ENV clause: setting
     * THROTTLE_DISABLED on a production deployment does nothing.
     * `throttling.e2e-spec.ts` runs without it and asserts the 429 still fires.
     */
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      skipIf: () =>
        process.env.NODE_ENV === 'test' && process.env.THROTTLE_DISABLED === 'true',
    }),

    DatabaseModule,
    MailModule,
    AuthModule,
    AuditLogModule,
    UsersModule,
    AccessModule,
    SettingsModule,
    MediaModule,
    DashboardModule,
    HealthModule,
    OrganizationsModule,
    PublicModule,
    CustomersModule,
    ContentModule,
    NotificationsModule,
  ],
  providers: [
    /*
     * Global enhancers live here, not in main.ts or feature modules, so their
     * order is explicit. Guards run in array order:
     *   ThrottlerGuard  — cheapest, and must protect /auth/login
     *   JwtAuthGuard    — populates request.user (staff principal)
     *   TenantGuard     — @OrganizationScoped routes: membership of :orgId → request.tenant
     *   PermissionsGuard — @PlatformOnly / @RequirePermissions (reads both)
     */
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },

    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          // The two flags that turn the DTO split into an actual defence:
          // unknown properties are rejected instead of reaching the entity.
          whitelist: true,
          forbidNonWhitelisted: true,
          transformOptions: { enableImplicitConversion: false },
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
          // Field-level errors: [{ field, message }].
          exceptionFactory: validationExceptionFactory,
        }),
    },

    /*
     * The first-registered interceptor is OUTERMOST, so its map() runs LAST.
     * TransformInterceptor must therefore come first: otherwise
     * ClassSerializerInterceptor receives the plain {success, data} envelope,
     * which carries no @Exclude() metadata, and `password` leaks on every
     * endpoint that returns a User entity.
     */
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },

    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // '{*splat}' — Express 5 / path-to-regexp v8 rejects a bare '*'.
    // Request id first, so the logger and error bodies can include it.
    consumer
      .apply(RequestIdMiddleware, LoggerMiddleware)
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });
  }
}

import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';
import * as entities from './entities';

export const dbEntities = Object.values(entities);

/**
 * Uses the DEFAULT connection. Schema changes go through migrations only:
 * `synchronize` is hard-wired off.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        if (String(process.env.DATABASE_SYNC).toLowerCase() === 'true') {
          new Logger('Database').warn(
            'DATABASE_SYNC is set but ignored — the schema is managed by migrations. ' +
              'Remove it from .env and run `npm run db:reset` for a clean local database.',
          );
        }

        return {
          ...dataSourceOptions,
          host: config.get<string>('DATABASE_HOST'),
          port: config.get<number>('DATABASE_PORT'),
          username: config.get<string>('DATABASE_USER'),
          password: config.get<string>('DATABASE_PASS'),
          database: config.get<string>('DATABASE_NAME'),
          entities: dbEntities,
          autoLoadEntities: false,
          retryAttempts: config.get<number>('DATABASE_RETRY_ATTEMPTS') ?? 3,
          synchronize: false,
        };
      },
    }),
    TypeOrmModule.forFeature(dbEntities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

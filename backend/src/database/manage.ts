import { createConnection } from 'mysql2/promise';
import { releaseDatabase, verifyDatabase } from './release';
import { DatabaseReleaseError } from './release-error';

/*
 *   db:init   create the database if missing, apply migrations   (local only)
 *   db:check  verify migrations + entity schema, print row counts
 *   db:reset  DROP and recreate the database, apply migrations   (local only)
 *
 * `reset` exists for development databases that were created with the old
 * `DATABASE_SYNC=true` flow (no migration history): they cannot take the
 * migrations in place, and recreating an empty dev database is the clean fix.
 */
const COMMANDS = ['check', 'init', 'reset'] as const;
type Command = (typeof COMMANDS)[number];

const CHARSET = 'CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci';

async function main() {
  const command = process.argv[2] as Command;
  if (process.argv.slice(2).length !== 1 || !COMMANDS.includes(command)) {
    throw new DatabaseReleaseError('invalid_arguments');
  }

  const { AppDataSource, appDatabaseOptions, requireLocalDevelopmentDatabase } =
    await import('./data-source');

  if (command === 'init' || command === 'reset') {
    // Throws unless NODE_ENV != production AND the host is loopback.
    requireLocalDevelopmentDatabase();
    const options = appDatabaseOptions;
    const connection = await createConnection({
      host: options.host,
      port: options.port,
      user: options.username,
      password: options.password,
      connectTimeout: 5000,
    });
    try {
      if (command === 'reset') {
        await connection.query(`DROP DATABASE IF EXISTS \`${options.database}\``);
        console.log(JSON.stringify({ database: options.database, status: 'dropped' }));
      }
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${options.database}\` ${CHARSET}`,
      );
    } finally {
      await connection.end();
    }
  }

  await AppDataSource.initialize();
  try {
    if (command === 'check') {
      await verifyDatabase(AppDataSource);
    } else {
      await releaseDatabase(AppDataSource);
    }

    const counts: Record<string, number> = {};
    for (const entity of AppDataSource.entityMetadatas) {
      counts[entity.tableName] = await AppDataSource.getRepository(entity.target).count(
        {
          withDeleted: true,
        },
      );
    }

    console.log(
      JSON.stringify(
        { database: AppDataSource.options.database, schema: 'ready', counts },
        null,
        2,
      ),
    );
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      status: 'failed',
      code:
        error instanceof DatabaseReleaseError
          ? error.code
          : error.message || 'database_unavailable',
    }),
  );
  process.exitCode = 1;
});

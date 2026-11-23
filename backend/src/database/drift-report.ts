/*
 * Development helper: prints the SQL TypeORM would need to run to make the
 * configured database match the entity metadata. "NO DRIFT" means entities
 * and migrations agree. Exits non-zero when drift exists.
 *
 *   npm run db:drift
 */
import { AppDataSource } from './data-source';

async function main() {
  await AppDataSource.initialize();
  try {
    const log = await AppDataSource.driver.createSchemaBuilder().log();
    const queries = log.upQueries.map((query) => query.query);
    console.log(queries.length ? `${queries.join(';\n')};` : 'NO DRIFT');
    if (queries.length) process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

void main();

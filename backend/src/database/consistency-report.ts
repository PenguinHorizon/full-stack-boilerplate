/*
 * Read-only report of cross-table rules (see consistency.ts). Exits non-zero
 * when any rule is broken, so it can gate a release or a restore.
 *
 *   npm run db:consistency
 */
import { checkConsistency } from './consistency';
import { AppDataSource } from './data-source';

async function main() {
  await AppDataSource.initialize();
  try {
    const { checks, issues } = await checkConsistency((sql, params) =>
      AppDataSource.query(sql, params),
    );
    if (!issues.length) {
      console.log(`CONSISTENT (${checks} checks)`);
      return;
    }
    for (const issue of issues) {
      console.log(`✗ ${issue.check} — ${issue.description}: ${issue.count} row(s)`);
      for (const row of issue.sample) console.log(`    ${JSON.stringify(row)}`);
    }
    console.log(`${issues.length} of ${checks} checks failed`);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

void main();

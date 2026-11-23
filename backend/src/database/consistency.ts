/*
 * Read-only consistency checks: rules that span tables and that the schema
 * itself can't enforce. Every check is a SELECT that returns the rows
 * breaking the rule; nothing is ever written.
 *
 *   - Every organization has settings and keeps an active owner.
 *   - Every reference stays inside one organization. The schema has plain foreign
 *     keys, so "same organization" is only enforced by application code; this is
 *     the safety net that would catch a missed check.
 *
 * Used by `npm run db:consistency` and by the e2e suites after real flows.
 */

export interface ConsistencyIssue {
  check: string;
  description: string;
  count: number;
  /** Up to five offending rows. */
  sample: Array<Record<string, unknown>>;
}

export interface ConsistencyReport {
  checks: number;
  issues: ConsistencyIssue[];
}

type Query = (
  sql: string,
  params?: unknown[],
) => Promise<Array<Record<string, unknown>>>;

interface Check {
  check: string;
  description: string;
  sql: string;
}

const RULES: Check[] = [
  {
    check: 'organization_settings.exists',
    description: 'Every organization has its settings row',
    sql: `SELECT r.id, r.slug FROM organizations r
          LEFT JOIN organization_settings s ON s.organization_id = r.id
          WHERE s.organization_id IS NULL`,
  },
  {
    check: 'organization_users.owner',
    description: 'Every live organization keeps at least one active owner',
    sql: `SELECT r.id, r.slug FROM organizations r
          WHERE r.deleted_at IS NULL AND r.status <> 'archived'
            AND EXISTS (SELECT 1 FROM organization_users m WHERE m.organization_id = r.id)
            AND NOT EXISTS (
              SELECT 1 FROM organization_users m JOIN users u ON u.id = m.user_id
              WHERE m.organization_id = r.id AND m.role = 'OWNER'
                AND m.is_active = 1 AND u.is_active = 1 AND u.deleted_at IS NULL)`,
  },
  {
    check: 'organizations.media',
    description: 'An organization’s logo, cover and icon come from its own library',
    sql: `SELECT r.id, m.id AS media_id, m.organization_id AS media_organization_id
          FROM organizations r
          JOIN media_assets m
            ON m.id IN (r.logo_media_id, r.cover_media_id, r.favicon_media_id)
          WHERE m.organization_id <> r.id`,
  },
];

/**
 * References that must stay inside one organization: [table, column, parent table].
 * Pairs whose table lacks the column or an organization_id are skipped (see run()).
 * Add a line here for every tenant-owned foreign key a new feature introduces.
 */
const SAME_ORGANIZATION: Array<[string, string, string]> = [
  ['customer_refresh_tokens', 'customer_id', 'customers'],
  ['banners', 'desktop_media_id', 'media_assets'],
  ['banners', 'mobile_media_id', 'media_assets'],
  ['gallery_images', 'media_id', 'media_assets'],
  ['testimonials', 'avatar_media_id', 'media_assets'],
  ['pages', 'hero_media_id', 'media_assets'],
];

/** Runs every check against the connected database (read-only). */
export async function checkConsistency(query: Query): Promise<ConsistencyReport> {
  const columns = new Set(
    (
      await query(
        `SELECT CONCAT(TABLE_NAME, '.', COLUMN_NAME) AS name
         FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`,
      )
    ).map((row) => String(row.name)),
  );
  const has = (table: string, column: string) => columns.has(`${table}.${column}`);

  const checks: Check[] = [...RULES];
  for (const [table, column, parent] of SAME_ORGANIZATION) {
    if (
      !has(table, column) ||
      !has(table, 'organization_id') ||
      !has(parent, 'organization_id')
    ) {
      continue;
    }
    checks.push({
      check: `${table}.${column}`,
      description: `${table}.${column} points into the same organization (${parent})`,
      sql: `SELECT t.${column} AS ref, t.organization_id, p.organization_id AS parent_organization_id
            FROM ${table} t JOIN ${parent} p ON p.id = t.${column}
            WHERE p.organization_id <> t.organization_id`,
    });
  }

  const issues: ConsistencyIssue[] = [];
  for (const { check, description, sql } of checks) {
    const [{ n }] = await query(`SELECT COUNT(*) AS n FROM (${sql}) AS offending`);
    const count = Number(n);
    if (count > 0) {
      issues.push({
        check,
        description,
        count,
        sample: await query(`${sql} LIMIT 5`),
      });
    }
  }
  return { checks: checks.length, issues };
}

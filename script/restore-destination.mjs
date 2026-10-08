import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Run from the project root, with the destination URL provided privately.
// Usage: DATABASE_URL=<private Railway URL> node script/restore-destination.mjs <private SQL> <private JSON>
const [sqlPath, jsonPath] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url || !sqlPath || !jsonPath) throw new Error('Destination URL and private SQL/JSON paths are required');
const parsed = new URL(url);
if (!(parsed.hostname === 'postgres.railway.internal' ||
      (parsed.hostname === 'maglev.proxy.rlwy.net' && parsed.port === '25479'))) {
  throw new Error('This restore is restricted to the selected Zibana Railway database');
}
const sql = await readFile(sqlPath, 'utf8');
const capture = JSON.parse(await readFile(jsonPath, 'utf8'));
const expectedRows = capture.tables.reduce((sum, table) => sum + table.rows.length, 0);
if (capture.tables.length !== 209 || expectedRows !== 1293) throw new Error('Unexpected backup inventory');
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 });
const ident = value => '"' + value.replaceAll('"', '""') + '"';
let transaction = false;
try {
  await client.connect();
  await client.query('BEGIN'); transaction = true;
  await client.query('SELECT pg_advisory_xact_lock(20261008)');
  const inventory = await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
  if (inventory.rows[0].n !== 0) throw new Error('Destination is not empty; refusing to overwrite any data');
  await client.query(sql.replace(/^\\.*$/gm, '').replace(/^(?:BEGIN|COMMIT);$/gm, ''));
  await client.query(await readFile('migrations/20261008_code_schema_alignment.sql', 'utf8'));
  for (const table of capture.tables) {
    const name = ident(table.schema) + '.' + ident(table.name);
    const result = await client.query(`WITH expected AS (SELECT to_jsonb(x) AS data FROM jsonb_populate_recordset(NULL::${name}, $1::jsonb) x), actual AS (SELECT to_jsonb(x) AS data FROM ${name} x) SELECT count(*)::int AS n FROM ((SELECT data FROM expected EXCEPT ALL SELECT data FROM actual) UNION ALL (SELECT data FROM actual EXCEPT ALL SELECT data FROM expected)) differences`, [JSON.stringify(table.rows)]);
    if (result.rows[0].n !== 0) throw new Error('Restored records did not match the selected backup');
  }
  await client.query('COMMIT'); transaction = false;
  console.log(JSON.stringify({ restored: true, tables: capture.tables.length, rows: expectedRows, recordComparisonPassed: true, sqlSha256: createHash('sha256').update(sql).digest('hex') }));
} catch (error) {
  if (transaction) await client.query('ROLLBACK').catch(() => {});
  console.error(JSON.stringify({ restored: false, code: error.code ?? 'RESTORE_BLOCKED', message: 'Restore stopped without committing changes. Check connectivity, destination emptiness and backup integrity privately.' }));
  process.exitCode = 1;
} finally { await client.end().catch(() => {}); }

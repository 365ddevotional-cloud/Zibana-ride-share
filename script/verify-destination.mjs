import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
try {
  await client.connect();
  for (const table of ['users', 'user_roles', 'driver_profiles', 'rider_profiles', 'sessions', 'notifications', 'trips']) {
    const result = await client.query('SELECT to_regclass($1) AS relation', [`public.${table}`]);
    if (!result.rows[0].relation) throw new Error('Destination restore has not been completed');
  }
  const fields = await client.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE (table_name='driver_profiles' AND column_name='vehicle_year') OR (table_name='accident_reports' AND column_name IN ('insurance_claim_ref','admin_reviewed_at')) OR (table_name='notifications' AND column_name='metadata')");
  if (fields.rows[0].n !== 4) throw new Error('Destination schema migration is missing');
  console.log('Zibana destination database readiness check passed');
} catch {
  console.error('Zibana destination database is not ready. Complete the private restore and additive migration before deployment.');
  process.exitCode = 1;
} finally { await client.end().catch(() => {}); }

/** Additive, idempotent migration; preserves existing drivers as car drivers. */
export async function ensureKekeSchema(db: { query(sql: string): Promise<unknown> }) {
  await db.query("ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS vehicle_category varchar(20) NOT NULL DEFAULT 'car'");
  await db.query("ALTER TYPE ride_class ADD VALUE IF NOT EXISTS 'keke'");
}

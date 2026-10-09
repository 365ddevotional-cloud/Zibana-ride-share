import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ensureKekeSchema } from '../server/keke-schema';
import { getDriverEligibleClasses } from '../shared/ride-classes';
import { estimateNigeriaProposal } from '../shared/nigeria-pricing-proposal';

test('migration preserves existing drivers and supports tricycles idempotently', async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE TYPE ride_class AS ENUM ('go'); CREATE TABLE driver_profiles (id integer); INSERT INTO driver_profiles VALUES (1)");
    await ensureKekeSchema(db); await ensureKekeSchema(db);
    assert.deepEqual((await db.query('SELECT * FROM driver_profiles')).rows, [{ id: 1, vehicle_category: 'car' }]);
    assert.equal((await db.query("SELECT 'keke'::ride_class AS value")).rows[0].value, 'keke');
  } finally { await db.close(); }
});
test('Keke eligibility requires a Nigerian tricycle and never enables car classes', () => {
  const base = { driverRating: 5, vehicleYear: 2026, hasPetApproval: true, hasBackgroundCheck: true, hasEliteApproval: true };
  assert.deepEqual(getDriverEligibleClasses({ ...base, vehicleCategory: 'keke', countryCode: 'NG' }).map(c => c.id), ['keke']);
  assert.equal(getDriverEligibleClasses({ ...base, vehicleCategory: 'keke', countryCode: 'US' }).length, 0);
  assert.ok(!getDriverEligibleClasses({ ...base, vehicleCategory: 'car', countryCode: 'NG' }).some(c => c.id === 'keke'));
});
test('proposal meets driver income and platform contribution floors across trip lengths and fuel stresses', () => {
  for (const category of ['car', 'keke'] as const) for (const fuel of [1355, 1400, 1800, 2400]) for (const [km, min] of [[2, 10], [5, 20], [10, 30], [1, 60]]) {
    const q = estimateNigeriaProposal(category, km, min, { petrolPerLitre: fuel });
    assert.ok(q.estimatedDriverHourly >= (category === 'car' ? 1800 : 600) - .01);
    assert.ok(q.platformContribution >= (category === 'car' ? 100 : 50) - .01);
    assert.equal(q.riderTotal, q.driverGross + q.platformRevenue);
    assert.equal(q.currency, 'NGN'); assert.equal(q.status, 'proposal');
  }
});
test('higher costs lift the fare floor; impossible payment economics and invalid inputs reject', () => {
  assert.ok(estimateNigeriaProposal('keke', 2, 10, { petrolPerLitre: 2400 }).riderTotal > estimateNigeriaProposal('keke', 2, 10).riderTotal);
  assert.throws(() => estimateNigeriaProposal('keke', 2, 10, { paymentRate: .1 }));
  for (const km of [-1, NaN, Infinity]) assert.throws(() => estimateNigeriaProposal('car', km, 10));
});

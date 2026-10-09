import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ensureKekeSchema } from '../server/keke-schema';
import { getDriverEligibleClasses } from '../shared/ride-classes';
import { estimateNigeriaFare } from '../shared/nigeria-pricing';

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
test('approved tariff meets driver income and platform contribution floors across trip lengths and fuel stresses', () => {
  for (const category of ['car', 'keke'] as const) for (const fuel of [1355, 1400, 1800, 2400]) for (const [km, min] of [[2, 10], [5, 20], [10, 30], [1, 60]]) {
    const q = estimateNigeriaFare(category, km, min, { petrolPerLitre: fuel });
    assert.ok(q.estimatedDriverHourly >= (category === 'car' ? 1800 : 600) - .01);
    assert.ok(q.platformContribution >= (category === 'car' ? 100 : 50) - .01);
    assert.equal(q.riderTotal, q.driverGross + q.platformRevenue);
    assert.equal(q.currency, 'NGN'); assert.equal(q.status, 'owner_approved');
  }
});
test('higher costs lift the fare floor; impossible payment economics and invalid inputs reject', () => {
  assert.ok(estimateNigeriaFare('keke', 2, 10, { petrolPerLitre: 2400 }).riderTotal > estimateNigeriaFare('keke', 2, 10).riderTotal);
  assert.throws(() => estimateNigeriaFare('keke', 2, 10, { paymentRate: .1 }));
  for (const km of [-1, NaN, Infinity]) assert.throws(() => estimateNigeriaFare('car', km, 10));
});


test('Mapbox recovers cost plus 60 percent without reducing driver pay or charging free usage', () => {
  const baseline = estimateNigeriaFare('keke', 5, 20);
  const paid = estimateNigeriaFare('keke', 5, 20, { mapboxCostNgn: 100 });
  assert.equal(baseline.mapboxRecoveryFee, 0);
  assert.equal(paid.mapboxRecoveryFee, 160);
  assert.equal(paid.mapboxGrossProfit, 60);
  assert.equal(paid.driverGross, baseline.driverGross);
  assert.equal(paid.transportFare, baseline.transportFare);
  assert.equal(paid.riderTotal - baseline.riderTotal, 160);
  assert.ok(Math.abs(paid.platformContribution - baseline.platformContribution - (60 - 160 * .02)) < .0001);
  const fraction = estimateNigeriaFare('car', 5, 20, { mapboxCostNgn: .003 });
  assert.equal(fraction.mapboxRecoveryFee, .01);
  for (const cost of [-1, NaN, Infinity]) assert.throws(() => estimateNigeriaFare('car', 5, 20, { mapboxCostNgn: cost }));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createMappingUsageLedger, directionsRequestCostMicroUsd } from '../server/mapping-usage-ledger';
import { previewDirections } from '../server/mapbox-directions';
const budget = { periodStart: '2026-10-01T00:00:00Z', periodEnd: '2026-11-01T00:00:00Z', startingRequests: 99999, maxRequests: 3, maxCostMicroUsd: 2000 };
const now = Date.parse('2026-10-09T00:00:00Z');
test('Directions estimate follows free and paid boundaries using integer microdollars', () => {
  assert.equal(directionsRequestCostMicroUsd(100000),0);
  assert.equal(directionsRequestCostMicroUsd(100001),2000);
  assert.equal(directionsRequestCostMicroUsd(500001),1600);
  assert.equal(directionsRequestCostMicroUsd(1000001),1200);
  assert.throws(() => directionsRequestCostMicroUsd(5000001));
});
test('durable reservations stop duplicate attempts, preserve failed-call budget and block overspend', async () => {
  const db = new PGlite();
  let tail = Promise.resolve();
  const pool = { query: async (q: string,v?: any[]) => db.query<any>(q,v), connect: async () => {
    const previous=tail; let release!: () => void; tail=new Promise<void>(r=>release=r); await previous;
    return { query: async (q: string,v?: any[])=>db.query<any>(q,v),release };
  } };
  const ledger=createMappingUsageLedger(pool);
  try {
    const free=await ledger.reserve('admin','request001',budget,now);
    assert.equal(free.category,'free'); await ledger.finish(free.id,true);
    await assert.rejects(ledger.reserve('admin','request001',budget,now), /already attempted/);
    const outcomes=await Promise.allSettled(['request002','request003'].map(k=>ledger.reserve('admin',k,budget,now)));
    assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
    const paid=outcomes.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<any>;
    assert.equal(paid.value.category,'paid'); await ledger.finish(paid.value.id,false);
    await assert.rejects(ledger.reserve('admin','request004',budget,now), /limit reached/);
    const restarted=createMappingUsageLedger(pool);
    const totals=(await restarted.summary())[0];
    assert.equal(Number(totals.requests),2); assert.equal(Number(totals.estimated_cost_micro_usd),2000);
    assert.equal(Number(totals.failed_requests),1);
    await assert.rejects(ledger.reserve('admin','request005',{...budget,startingRequests:0},now), /cannot be redefined/);
    await assert.rejects(ledger.reserve('admin','request006',budget,Date.parse(budget.periodEnd)));
  } finally { await db.close(); }
});
test('disabled provider and malformed coordinates make no network request and reserve no budget', async () => {
  const env={...process.env}, fetch=globalThis.fetch;
  try {
    globalThis.fetch=async()=>{throw new Error('Unexpected network call');};
    const ledger={reserve:async()=>{throw new Error('Unexpected reserve');}} as any;
    delete process.env.MAPBOX_DIRECTIONS_ENABLED;
    await assert.rejects(previewDirections(ledger,'admin','request007',[[0,0],[1,1]]), /not configured/);
    process.env.MAPBOX_DIRECTIONS_ENABLED='true';process.env.MAPBOX_ACCESS_TOKEN='fixture';
    await assert.rejects(previewDirections(ledger,'admin','request008',[[181,0],[1,1]]), /valid longitude/);
  } finally { process.env=env; globalThis.fetch=fetch; }
});

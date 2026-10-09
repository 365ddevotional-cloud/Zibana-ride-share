/** Server-side Directions request accounting. Costs are estimates until invoice reconciliation. */
import { randomUUID } from 'node:crypto';
interface Client { query(sql: string, values?: any[]): Promise<{ rows: any[] }>; release(): void }
interface Pool { query(sql: string, values?: any[]): Promise<{ rows: any[] }>; connect(): Promise<Client> }
export interface MappingBudget {
  periodStart: string; periodEnd: string; startingRequests: number; maxRequests: number; maxCostMicroUsd: number;
}
export const MAPPING_USAGE_SCHEMA = `
CREATE TABLE IF NOT EXISTS mapping_usage_periods (
 period_start timestamptz PRIMARY KEY, period_end timestamptz NOT NULL,
 starting_requests bigint NOT NULL, requests bigint NOT NULL DEFAULT 0, estimated_cost_micro_usd bigint NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS mapping_usage_requests (
 id uuid PRIMARY KEY, period_start timestamptz NOT NULL REFERENCES mapping_usage_periods(period_start),
 request_key varchar(100) NOT NULL UNIQUE, actor_id varchar NOT NULL,
 category varchar(10) NOT NULL CHECK(category IN ('free','paid')), estimated_cost_micro_usd bigint NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','succeeded','failed')),
 created_at timestamptz NOT NULL DEFAULT now()
);`;
export function directionsRequestCostMicroUsd(ordinal: number): number {
  if (!Number.isSafeInteger(ordinal) || ordinal < 1 || ordinal > 5000000) throw new Error('Request tier requires review');
  return ordinal <= 100000 ? 0 : ordinal <= 500000 ? 2000 : ordinal <= 1000000 ? 1600 : 1200;
}
export function createMappingUsageLedger(pool: Pool) {
  let ready: Promise<unknown> | undefined;
  const ensure = async () => { ready ??= (async () => { for (const statement of MAPPING_USAGE_SCHEMA.split(";").filter(s => s.trim())) await pool.query(statement); })().catch(e => { ready = undefined; throw e; }); await ready; };
  return {
    async reserve(actorId: string, requestKey: string, budget: MappingBudget, now = Date.now()) {
      const start = Date.parse(budget.periodStart), end = Date.parse(budget.periodEnd);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > now || end <= now || end <= start ||
        ![budget.startingRequests, budget.maxRequests, budget.maxCostMicroUsd].every(n => Number.isSafeInteger(n) && n >= 0) ||
        budget.maxRequests < 1 || budget.startingRequests + budget.maxRequests > 5000000 ||
        !actorId || !/^[A-Za-z0-9_-]{8,100}$/.test(requestKey)) throw new Error('Invalid mapping budget or request');
      await ensure(); const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query(`INSERT INTO mapping_usage_periods (period_start, period_end, starting_requests) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [budget.periodStart, budget.periodEnd, budget.startingRequests]);
        const p = (await c.query('SELECT * FROM mapping_usage_periods WHERE period_start=$1 FOR UPDATE', [budget.periodStart])).rows[0];
        if (Number(p.starting_requests) !== budget.startingRequests || new Date(p.period_end).getTime() !== end) throw new Error('Billing period cannot be redefined');
        const duplicate = await c.query('SELECT id FROM mapping_usage_requests WHERE request_key=$1', [requestKey]);
        if (duplicate.rows.length) throw new Error('Mapping request already attempted; do not repeat');
        const cost = directionsRequestCostMicroUsd(budget.startingRequests + Number(p.requests) + 1);
        if (Number(p.requests) >= budget.maxRequests || Number(p.estimated_cost_micro_usd) + cost > budget.maxCostMicroUsd) throw new Error('Mapping usage limit reached');
        const id = randomUUID(); const category = cost === 0 ? 'free' : 'paid';
        await c.query(`INSERT INTO mapping_usage_requests (id,period_start,request_key,actor_id,category,estimated_cost_micro_usd) VALUES ($1,$2,$3,$4,$5,$6)`,
          [id,budget.periodStart,requestKey,actorId,category,cost]);
        await c.query('UPDATE mapping_usage_periods SET requests=requests+1,estimated_cost_micro_usd=estimated_cost_micro_usd+$2 WHERE period_start=$1', [budget.periodStart,cost]);
        await c.query('COMMIT'); return { id, category, estimatedCostMicroUsd: cost };
      } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
    },
    async finish(id: string, success: boolean) {
      await ensure();
      // Do not refund budget on failure: the provider may have processed a timed-out request.
      await pool.query("UPDATE mapping_usage_requests SET status=$2 WHERE id=$1 AND status='reserved'", [id,success ? 'succeeded' : 'failed']);
    },
    async summary() {
      await ensure();
      return (await pool.query(`SELECT p.*, (SELECT count(*) FROM mapping_usage_requests r WHERE r.period_start=p.period_start AND r.status='failed') AS failed_requests
        FROM mapping_usage_periods p ORDER BY period_start DESC LIMIT 12`)).rows;
    },
  };
}

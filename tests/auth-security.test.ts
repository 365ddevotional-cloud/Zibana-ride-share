import assert from 'node:assert/strict';
import test from 'node:test';
process.env.DATABASE_URL = 'postgres://unused:unused@localhost/unused';
const { isAuthenticated, getSession, setupAuth } = await import('../server/replit_integrations/auth/replitAuth');
const { getSimulationConfig } = await import('../server/simulation-config');
function check(user: any, authenticated: boolean, session?: any) {
  let status: number | undefined;
  let passed = false;
  const req = { user, session, isAuthenticated: () => authenticated };
  const res = { status(code: number) { status = code; return this; }, json() {} };
  isAuthenticated(req as any, res as any, () => { passed = true; });
  return { status, passed };
}
test('anonymous requests and restored simulation sessions never grant access', () => {
  assert.deepEqual(check(undefined, false), { status: 401, passed: false });
  assert.deepEqual(check(undefined, false, { simulationActive: true, simulatedUserId: 'admin' }), { status: 401, passed: false });
});
test('development administrator and expired identities are rejected', () => {
  const now = Date.now() / 1000;
  assert.equal(check({ claims: { sub: 'dev-user' }, expires_at: now + 60 }, true).status, 401);
  assert.equal(check({ claims: { sub: 'real-user' }, expires_at: now - 60 }, true).status, 401);
  assert.equal(check({ claims: { sub: 'real-user' } }, true).status, 401);
  assert.equal(check({ claims: { sub: 'real-user' }, expires_at: now + 60 }, false).status, 401);
  assert.equal(check({ claims: { sub: 'real-user' }, expires_at: now + 60 }, true).passed, true);
});
test('simulation remains disabled in production even with its flag enabled', () => {
  process.env.NODE_ENV = 'production';
  process.env.SIMULATION_MODE_ENABLED = 'true';
  assert.equal(getSimulationConfig().enabled, false);
});
test('missing session secrets and missing provider configuration fail closed', async () => {
  delete process.env.SESSION_SECRET;
  assert.throws(getSession, /SESSION_SECRET/);
  await assert.rejects(setupAuth({} as any), /Configure APP_BASE_URL/);
});

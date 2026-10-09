import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSync } from 'esbuild';
const stripTypeScriptTypes = source => transformSync(source, { loader: 'ts', target: 'es2022', format: 'esm' }).code;
import { createHmac } from 'node:crypto';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
let countries;
globalThis.__paymentStorage = { getAllCountriesWithPaymentStatus: async () => countries };
const paymentSource = (await readFile(new URL('../server/payment-provider.ts', import.meta.url), 'utf8'))
  .replace('import { storage } from "./storage";', 'const storage = globalThis.__paymentStorage;');
const payments = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(paymentSource)).toString('base64'));
const payouts = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(await readFile(new URL('../server/payout-provider.ts', import.meta.url), 'utf8'))).toString('base64'));
const request = { amount: 100.25, currency: 'NGN', userId: 'rider-one', email: 'rider@example.com' };
const verified = { status: true, data: { status: 'success', reference: 'ZIBANA_test', amount: 10025, currency: 'NGN', domain: 'live', metadata: { userId: 'rider-one' } } };
beforeEach(() => {
  process.env.NODE_ENV = 'production';
  process.env.PAYSTACK_SECRET_KEY = 'sk_live_fixture';
  process.env.SIMULATION_MODE_ENABLED = 'false';
  process.env.WALLET_FUNDING_ENABLED = 'false';
  countries = [{ isoCode: 'NG', paymentsEnabled: true, paymentProvider: 'paystack' }];
  globalThis.fetch = async () => { throw new Error('Unexpected provider request'); };
});
after(() => { process.env = originalEnv; globalThis.fetch = originalFetch; delete globalThis.__paymentStorage; });

test('unsupported country cannot simulate successful production funding', async () => {
  process.env.SIMULATION_MODE_ENABLED = 'true';
  assert.equal((await payments.processPayment('US', { ...request, currency: 'USD' })).success, false);
  assert.equal((await payments.verifyPayment('US', 'SIM_fake')).success, false);
});
test('missing secret disables real-payment readiness', async () => {
  delete process.env.PAYSTACK_SECRET_KEY;
  assert.equal(await payments.isRealPaymentsEnabled('NG'), false);
  assert.equal((await payments.processPayment('NG', request)).success, false);
});
test('test secret cannot enable production payments', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_fixture';
  assert.equal(await payments.isRealPaymentsEnabled('NG'), false);
  assert.equal((await payments.getPaymentProvider('paystack').initializePayment(request)).success, false);
});
test('manual and unknown country providers never claim real payment readiness', async () => {
  for (const provider of ['manual', 'placeholder', 'unexpected']) {
    countries[0].paymentProvider = provider;
    assert.equal(await payments.isRealPaymentsEnabled('NG'), false);
    assert.equal((await payments.processPayment('NG', request)).success, false);
    assert.equal((await payments.getPaymentProvider(provider).initializePayment(request)).success, false);
  }
});
test('amount is converted once, with initialization distinguished from settlement', async () => {
  let sent;
  globalThis.fetch = async (_url, options) => { sent = JSON.parse(options.body); return Response.json({ status: true, data: { reference: sent.reference, authorization_url: 'https://checkout.paystack.com/test' } }); };
  const result = await payments.processPayment('NG', request);
  assert.equal(sent.amount, 10025);
  assert.equal(sent.currency, 'NGN');
  assert.equal(sent.metadata.userId, 'rider-one');
  assert.equal(result.status, 'initialized');
  assert.match(sent.reference, /^ZIBANA_[0-9a-f-]{36}$/);
});
test('invalid amount, currency or account is rejected before contacting provider', async () => {
  for (const change of [{ amount: -1 }, { amount: 0 }, { amount: NaN }, { amount: Infinity }, { amount: 1.001 }, { amount: '100' }, { amount: 100000000 }, { currency: 'USD' }, { userId: '' }, { email: '' }]) {
    assert.equal((await payments.processPayment('NG', { ...request, ...change })).success, false);
  }
});
test('provider HTTP error cannot be treated as successful initialization', async () => {
  globalThis.fetch = async () => Response.json({ status: true, data: { reference: 'x', authorization_url: 'https://checkout.paystack.com/x' } }, { status: 500 });
  assert.equal((await payments.processPayment('NG', request)).success, false);
});
test('verified result contains currency, amount and account for settlement checks', async () => {
  globalThis.fetch = async () => Response.json(verified);
  const result = await payments.verifyPayment('NG', 'ZIBANA_test');
  assert.equal(result.status, 'verified');
  assert.equal(result.amount, 100.25);
  assert.equal(result.currency, 'NGN');
  assert.equal(result.userId, 'rider-one');
});
test('mismatched reference, currency, invalid amount or missing owner cannot verify', async () => {
  for (const change of [{ reference: 'another' }, { currency: 'USD' }, { amount: 0 }, { amount: -100 }, { amount: 10.5 }, { metadata: {} }, { domain: 'test' }, { status: 'pending' }]) {
    globalThis.fetch = async () => Response.json({ status: true, data: { ...verified.data, ...change } });
    assert.equal((await payments.verifyPayment('NG', 'ZIBANA_test')).success, false);
  }
});
test('malformed reference cannot alter verification URL', async () => {
  for (const ref of ['../another', 'x?currency=USD', '', 'x'.repeat(151)]) assert.equal((await payments.verifyPayment('NG', ref)).success, false);
});
test('manual withdrawal adapter cannot claim an unrecorded payment', async () => {
  assert.equal((await payments.processWithdrawal('NG', { amount: 100, currency: 'NGN', userId: 'driver' })).success, false);
});
test('webhook validates exact bytes; altered bytes and malformed signatures fail', () => {
  const raw = Buffer.from('{ "event": "charge.success", "data": {} }');
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  assert.equal(payouts.validatePaystackWebhook(raw, signature), true);
  assert.equal(payouts.validatePaystackWebhook(JSON.stringify(JSON.parse(raw)), signature), false);
  for (const bad of [undefined, '', 'nothex', 'a'.repeat(128), signature + '00']) assert.equal(payouts.validatePaystackWebhook(raw, bad), false);
});
const routes = await readFile(new URL('../server/routes.ts', import.meta.url), 'utf8');
function routeBlock(path, nextMarker) { const a = routes.indexOf(`  app.post("${path}"`); return routes.slice(a, routes.indexOf(nextMarker, a)); }
test('actual wallet funding handler cannot start a charge before settlement is ready', async () => {
  let handler;
  const app = { post: (...args) => { handler = args.at(-1); } };
  const a = routes.indexOf('  app.post("/api/wallet/fund"'), b = routes.indexOf('\n  });', a) + '\n  });'.length;
  const code = stripTypeScriptTypes(routes.slice(a,b));
  new Function('app', 'isAuthenticated', 'requireRole', code)(app, () => {}, () => () => {});
  let status, body;
  await handler({ body: { amount: 100 }, user: { claims: { sub: 'rider-one' } } }, { status(n) { status = n; return this; }, json(data) { body = data; } });
  assert.equal(status, 503);
  assert.equal(body.code, 'WALLET_FUNDING_UNAVAILABLE');
});
test('actual webhook handler authenticates raw payload without JSON reserialization', async () => {
  let handler;
  const app = { post: (_path, fn) => { handler = fn; } };
  const code = stripTypeScriptTypes(routeBlock('/api/webhooks/paystack', '  // Flutterwave Webhook'));
  new Function('app', 'validatePaystackWebhook', 'storage', code)(app, payouts.validatePaystackWebhook, {});
  const raw = Buffer.from('{ "event": "unhandled.event", "data": {} }');
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  let status;
  const response = { status(n) { status = n; return this; }, json() {} };
  await handler({ rawBody: raw, body: JSON.parse(raw), headers: { 'x-paystack-signature': signature } }, response);
  assert.equal(status, 200);
  await handler({ body: JSON.parse(raw), headers: { 'x-paystack-signature': signature } }, response);
  assert.equal(status, 400);
});
test('actual auto-top-up method cannot credit wallet or charge a card', async () => {
  const source = await readFile(new URL('../server/storage.ts', import.meta.url), 'utf8');
  const a = source.indexOf('  async triggerAutoTopUp('), b = source.indexOf('\n  }', a) + '\n  }'.length;
  const method = stripTypeScriptTypes('const target = {' + source.slice(a, b) + '};');
  const target = new Function(method + ';return target;')();
  let failedAttempt;
  target.getRiderWallet = async () => ({ autoTopUpEnabled: true, autoTopUpPaymentMethodId: 'saved-card' });
  target.recordAutoTopUpAttempt = async (_id, success) => { failedAttempt = success; };
  target.adjustRiderWalletBalance = () => { assert.fail('Unsettled credit'); };
  await target.triggerAutoTopUp('rider-one');
  assert.equal(failedAttempt, false);
});
test('production booking APIs reject client-provided fare before creating or charging a ride', async () => {
  for (const path of ['/api/rider/request-ride', '/api/rides']) {
    let handler;
    const app = { post: (...args) => { handler = args.at(-1); } };
    const a = routes.indexOf(`  app.post("${path}"`), b = routes.indexOf('\n  });', a) + '\n  });'.length;
    new Function('app', 'isAuthenticated', 'requireRole', stripTypeScriptTypes(routes.slice(a,b)))(app, () => {}, () => () => {});
    let status, body;
    await handler({ body: { fareAmount: 1, paymentSource: 'TEST_WALLET' } }, { status(n) { status = n; return this; }, json(data) { body = data; } });
    assert.equal(status, 503);
    assert.equal(body.code, 'BOOKING_UNAVAILABLE');
  }
});
test('production saved-card APIs cannot fabricate a card or charge for unsaved authorization', async () => {
  for (const path of ['/api/rider/payment-methods','/api/rider/payment-methods/add-card/initialize','/api/rider/payment-methods/add-card/verify']) {
    let handler;
    const app = { post: (...args) => { handler = args.at(-1); } };
    const a = routes.indexOf(`  app.post("${path}"`), b = routes.indexOf('\n  });', a) + '\n  });'.length;
    new Function('app', 'isAuthenticated', 'requireRole', stripTypeScriptTypes(routes.slice(a,b)))(app, () => {}, () => () => {});
    let status, body;
    await handler({ body: { providerReusable: true, providerAuthCode: 'forged' } }, { status(n) { status = n; return this; }, json(data) { body = data; } });
    assert.equal(status, 503);
    assert.equal(body.code, 'SAVED_PAYMENTS_UNAVAILABLE');
  }
});

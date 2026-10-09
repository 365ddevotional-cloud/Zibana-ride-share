import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { FincraAdapter, fincraReady, validateFincraWebhook } from '../server/fincra-provider';
const env = { ...process.env }, originalFetch = globalThis.fetch;
const adapter = new FincraAdapter();
const reference = 'ZIBANA_FCR_test';
const request = { amount: 100.25, currency: 'NGN', userId: 'rider', email: 'rider@example.com', customerName: 'Test Rider',
  purpose: 'wallet_funding' as const, transactionRef: reference, callbackUrl: 'https://example.com/api/wallet/verify' };
const verified = { businessId: 'business', merchantReference: reference, status: 'success', currency: 'NGN', convertedCurrency: 'NGN',
  amount: 100.25, amountReceived: 100.25, amountExpected: 100.25, feeBearer: 'business', varianceType: null, actionRequired: null,
  metadata: { userId: 'rider', purpose: 'wallet_funding' }, customer: { email: request.email } };
beforeEach(() => {
  Object.assign(process.env, { NODE_ENV: 'production', FINCRA_ENABLED: 'true', FINCRA_MODE: 'live', FINCRA_LIVE_VERIFIED: 'true',
    FINCRA_SECRET_KEY: 'fixture', FINCRA_PUBLIC_KEY: 'fixture', FINCRA_BUSINESS_ID: 'business', FINCRA_WEBHOOK_SECRET: 'fixture-secret' });
  globalThis.fetch = async () => { throw new Error('Unexpected provider call'); };
});
after(() => { process.env = env; globalThis.fetch = originalFetch; });
test('Fincra fails closed for missing credentials, unverified live setup and sandbox on production', async () => {
  for (const key of ['FINCRA_SECRET_KEY', 'FINCRA_PUBLIC_KEY', 'FINCRA_BUSINESS_ID', 'FINCRA_WEBHOOK_SECRET', 'FINCRA_LIVE_VERIFIED']) {
    const value = process.env[key]; delete process.env[key];
    assert.equal(fincraReady(), false); assert.equal((await adapter.initializePayment(request)).success, false);
    process.env[key] = value;
  }
  process.env.FINCRA_MODE = 'sandbox'; assert.equal(fincraReady(), false);
});
test('checkout preserves major-unit amount and server reference without crediting wallet', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.fincra.com/checkout/payments');
    const sent = JSON.parse(options!.body as string);
    assert.equal(sent.amount, 100.25); assert.equal(sent.reference, reference); assert.equal(sent.feeBearer, 'business');
    assert.equal(sent.metadata.userId, 'rider');
    return Response.json({ status: true, data: { reference, link: 'https://checkout.fincra.com/pay/test' } });
  };
  assert.equal((await adapter.initializePayment(request)).status, 'initialized');
});
test('checkout rejects unsupported currency, invalid inputs and untrusted redirect hosts', async () => {
  for (const change of [{ currency: 'USD' }, { amount: NaN }, { amount: 100.001 }, { customerName: '' }, { transactionRef: 'bad' }]) {
    assert.equal((await adapter.initializePayment({ ...request, ...change })).success, false);
  }
  globalThis.fetch = async () => Response.json({ status: true, data: { reference, link: 'https://checkout.fincra.com.attacker.test/pay' } });
  assert.equal((await adapter.initializePayment(request)).success, false);
});
test('verify returns settlement evidence and rejects wrong account, amount, currency and underpayment success', async () => {
  globalThis.fetch = async () => Response.json({ status: true, data: verified });
  assert.equal((await adapter.verifyPayment(reference)).amount, 100.25);
  for (const change of [{ businessId: 'other' }, { merchantReference: 'other' }, { currency: 'USD' }, { amountReceived: 99 },
    { amountReceived: 101 }, { varianceType: 'underpayment' }, { actionRequired: 'refund' }, { status: 'pending' }, { metadata: {} },
    { amountExpected: 101 }, { feeBearer: 'customer' }]) {
    globalThis.fetch = async () => Response.json({ status: true, data: { ...verified, ...change } });
    assert.equal((await adapter.verifyPayment(reference)).success, false);
  }
});
test('webhook signature authenticates original bytes and rejects tampering', () => {
  const raw = Buffer.from('{"event":"charge.successful"}');
  const signature = createHmac('sha512', 'fixture-secret').update(raw).digest('hex');
  assert.equal(validateFincraWebhook(raw, signature), true);
  assert.equal(validateFincraWebhook(Buffer.from('{}'), signature), false);
  assert.equal(validateFincraWebhook(raw, 'bad'), false);
});

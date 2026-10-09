import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createWalletFundingLedger, fundingAmountMinor } from "../server/wallet-funding-ledger";
import type { PaymentResult } from "../server/payment-provider";

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE users (id varchar PRIMARY KEY);
    CREATE TABLE rider_wallets (id varchar PRIMARY KEY, user_id varchar UNIQUE NOT NULL REFERENCES users(id),
      balance numeric(10,2) NOT NULL, currency varchar(3) NOT NULL, is_frozen boolean NOT NULL DEFAULT false, updated_at timestamp);
    CREATE TABLE rider_transaction_history (id varchar PRIMARY KEY, rider_id varchar NOT NULL REFERENCES users(id),
      type text NOT NULL, amount numeric(10,2) NOT NULL, source text NOT NULL, reference_id varchar, description text);
    INSERT INTO users VALUES ('rider-one'), ('rider-two');
    INSERT INTO rider_wallets (id,user_id,balance,currency) VALUES ('wallet-one','rider-one',10,'NGN'), ('wallet-two','rider-two',20,'USD');
  `);
  let receiptFailure = false;
  // PGlite exposes a single connection. Serialize transaction clients as a local pool would.
  let tail = Promise.resolve();
  const pool = {
    query: async (sql: string, values?: any[]) => db.query<any>(sql, values),
    connect: async () => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>(resolve => { release = resolve; });
      await previous;
      return {
        query: async (sql: string, values?: any[]) => {
          if (receiptFailure && sql.includes("INSERT INTO rider_transaction_history")) throw new Error("Injected receipt failure");
          return db.query<any>(sql, values);
        },
        release,
      };
    },
  };
  const ledger = createWalletFundingLedger(pool);
  const intent = await ledger.createIntent("rider-one", "wallet-one", "Rider@Example.com", 100.25);
  const payment: PaymentResult = { success: true, status: "verified", transactionRef: intent.reference,
    amount: 100.25, currency: "NGN", userId: "rider-one", email: "rider@example.com", purpose: "wallet_funding" };
  return { db, ledger, intent, payment, failReceipt: (fail = true) => { receiptFailure = fail; },
    balance: async () => (await db.query<any>("SELECT balance FROM rider_wallets WHERE id = 'wallet-one'")).rows[0].balance,
    receiptCount: async () => Number((await db.query<any>("SELECT count(*) FROM rider_transaction_history")).rows[0].count) };
}

test("funding amount rejects invalid precision, unsupported inputs and out-of-range amounts", () => {
  assert.equal(fundingAmountMinor(100.25), 10025);
  assert.equal(fundingAmountMinor(99999999.99), 9999999999);
  for (const amount of [0, -100, 99.99, 100.001, NaN, Infinity, "100", 100000000]) assert.throws(() => fundingAmountMinor(amount));
});

test("funding intent is stored before payment and cannot use another account's wallet", async () => {
  const f = await fixture();
  try {
    assert.equal(f.intent.email, "rider@example.com");
    assert.equal(Number(f.intent.amount_minor), 10025);
    assert.equal(f.intent.status, "pending");
    await assert.rejects(f.ledger.createIntent("rider-two", "wallet-one", "other@example.com", 100));
    await assert.rejects(f.ledger.createIntent("rider-two", "wallet-two", "other@example.com", 100));
    await f.db.query("UPDATE rider_wallets SET is_frozen = true WHERE id = 'wallet-one'");
    await assert.rejects(f.ledger.createIntent("rider-one", "wallet-one", "rider@example.com", 100));
    assert.equal(Number((await f.db.query<any>("SELECT count(*) FROM wallet_payment_intents")).rows[0].count), 1);
  } finally { await f.db.close(); }
});

test("verified funding commits wallet credit and receipt together", async () => {
  const f = await fixture();
  try {
    const result = await f.ledger.settle(f.intent.reference, f.payment);
    assert.equal(result.credited, true);
    assert.equal(await f.balance(), "110.25");
    assert.equal(await f.receiptCount(), 1);
    assert.equal((await f.ledger.getIntent(f.intent.reference)).status, "settled");
    const receipt = (await f.db.query<any>("SELECT * FROM rider_transaction_history")).rows[0];
    assert.equal(receipt.reference_id, f.intent.reference);
    assert.equal(receipt.rider_id, "rider-one");
    assert.equal(receipt.amount, "100.25");
  } finally { await f.db.close(); }
});

test("repeated callback and webhook deliveries issue exactly one credit", async () => {
  const f = await fixture();
  try {
    const results = await Promise.all(Array.from({ length: 5 }, () => f.ledger.settle(f.intent.reference, f.payment)));
    assert.equal(results.filter(r => r.credited).length, 1);
    assert.equal(await f.balance(), "110.25");
    assert.equal(await f.receiptCount(), 1);
    await f.ledger.markInitialized(f.intent.reference, true);
    await f.ledger.markInitialized(f.intent.reference, false);
    assert.equal((await f.ledger.getIntent(f.intent.reference)).status, "settled");
  } finally { await f.db.close(); }
});

test("mismatched amount, currency, account, email, reference, purpose or unconfirmed status cannot credit", async () => {
  const f = await fixture();
  try {
    for (const change of [{ amount: 100 }, { amount: 101 }, { currency: "USD" }, { userId: "rider-two" },
      { email: "other@example.com" }, { transactionRef: "another" }, { purpose: "card_authorization" },
      { success: false }, { status: "initialized" as const }]) {
      await assert.rejects(f.ledger.settle(f.intent.reference, { ...f.payment, ...change }));
    }
    assert.equal(await f.balance(), "10.00");
    assert.equal(await f.receiptCount(), 0);
    assert.equal((await f.ledger.getIntent(f.intent.reference)).status, "pending");
  } finally { await f.db.close(); }
});

test("receipt insertion failure rolls back wallet credit and permits a later retry", async () => {
  const f = await fixture();
  try {
    f.failReceipt();
    await assert.rejects(f.ledger.settle(f.intent.reference, f.payment), /Injected receipt failure/);
    assert.equal(await f.balance(), "10.00");
    assert.equal(await f.receiptCount(), 0);
    assert.equal((await f.ledger.getIntent(f.intent.reference)).status, "pending");
    f.failReceipt(false);
    await f.ledger.settle(f.intent.reference, f.payment);
    assert.equal(await f.balance(), "110.25");
    assert.equal(await f.receiptCount(), 1);
  } finally { await f.db.close(); }
});

test("changed wallet currency cannot receive a payment in the previous currency", async () => {
  const f = await fixture();
  try {
    await f.db.query("UPDATE rider_wallets SET currency = 'USD' WHERE id = 'wallet-one'");
    await assert.rejects(f.ledger.settle(f.intent.reference, f.payment), /currency or owner changed/);
    assert.equal(await f.balance(), "10.00");
    assert.equal(await f.receiptCount(), 0);
  } finally { await f.db.close(); }
});

test("a provider-confirmed payment can reconcile a timed-out initialization", async () => {
  const f = await fixture();
  try {
    await f.ledger.markInitialized(f.intent.reference, false);
    assert.equal((await f.ledger.getIntent(f.intent.reference)).status, "initialization_failed");
    await f.ledger.settle(f.intent.reference, f.payment);
    assert.equal(await f.balance(), "110.25");
  } finally { await f.db.close(); }
});

test("unknown reference cannot create a credit", async () => {
  const f = await fixture();
  try {
    await assert.rejects(f.ledger.settle("ZIBANA_unknown", f.payment), /not found/);
    assert.equal(await f.balance(), "10.00");
  } finally { await f.db.close(); }
});

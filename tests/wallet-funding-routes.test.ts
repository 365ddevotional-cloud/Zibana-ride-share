import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";
import { fundingAmountMinor } from "../server/wallet-funding-ledger";

const source = readFileSync(new URL("../server/routes.ts", import.meta.url), "utf8");
const originalEnv = { ...process.env };
beforeEach(() => {
  process.env.WALLET_FUNDING_ENABLED = "true";
  process.env.NODE_ENV = "production";
  process.env.APP_BASE_URL = "https://zibana.example";
});
after(() => { process.env = originalEnv; });

function handler(method: "get" | "post", path: string, context: Record<string, any>) {
  const a = source.indexOf(`  app.${method}("${path}"`);
  assert.notEqual(a, -1);
  const b = source.indexOf("\n  });", a) + "\n  });".length;
  let captured: any;
  const app = { [method]: (...args: any[]) => { captured = args.at(-1); } };
  const code = transformSync(source.slice(a,b).replaceAll('await import("./payment-provider")', "paymentApi"),
    { loader: "ts", target: "es2022", format: "esm" }).code;
  const values = { app, isAuthenticated: () => {}, requireRole: () => () => {}, fundingAmountMinor,
    routeParam: (req: any, key: string) => req.params[key], ...context };
  new Function(...Object.keys(values), code)(...Object.values(values));
  return captured;
}
function response() {
  return { statusCode: 200, body: null as any, location: "",
    status(n: number) { this.statusCode = n; return this; },
    json(value: any) { this.body = value; }, redirect(url: string) { this.location = url; } };
}
function fixture() {
  let initialized: any, recorded: any, settled: any;
  const context = {
    storage: { getAllUserRoles: async () => [{ role: "rider", countryCode: "NG" }],
      getRiderWallet: async () => ({ id: "wallet-one", currency: "NGN", isFrozen: false }) },
    walletFundingLedger: {
      createIntent: async (...args: any[]) => { recorded = args; return { reference: "ZIBANA_fixture" }; },
      markInitialized: async () => {},
      getIntent: async () => ({ user_id: "rider-one", amount_minor: "10025", currency: "NGN", status: "settled" }),
      settle: async (...args: any[]) => { settled = args; },
    },
    paymentApi: {
      isRealPaymentsEnabled: async () => true,
      processPayment: async (country: string, request: any) => { initialized = { country, request };
        return { success: true, authorizationUrl: "https://checkout.paystack.com/fixture" }; },
      verifyPayment: async () => ({ success: true, status: "verified", userId: "rider-one", amount: 100.25, currency: "NGN", transactionRef: "ZIBANA_fixture" }),
    },
  };
  return { context, initialized: () => initialized, recorded: () => recorded, settled: () => settled };
}
const user = { claims: { sub: "rider-one", email: "rider@example.com" } };

test("checkout records the authenticated wallet and amount before contacting the provider", async () => {
  const f = fixture(), res = response();
  await handler("post", "/api/wallet/fund", f.context)({ user, protocol: "http", get: () => "attacker.example",
    body: { amount: 100.25, userId: "attacker", countryCode: "US", currency: "USD" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(f.recorded(), ["rider-one", "wallet-one", "rider@example.com", 100.25]);
  assert.equal(f.initialized().country, "NG");
  assert.equal(f.initialized().request.currency, "NGN");
  assert.equal(f.initialized().request.userId, "rider-one");
  assert.equal(f.initialized().request.transactionRef, "ZIBANA_fixture");
  assert.equal(f.initialized().request.purpose, "wallet_funding");
  assert.equal(f.initialized().request.callbackUrl, "https://zibana.example/api/wallet/verify");
});
test("frozen wallet, wrong country, wrong currency and missing provider cannot start checkout", async () => {
  for (const condition of ["frozen", "country", "currency", "provider"]) {
    const f = fixture(), res = response();
    if (condition === "frozen") f.context.storage.getRiderWallet = async () => ({ id: "wallet-one", currency: "NGN", isFrozen: true });
    if (condition === "country") f.context.storage.getAllUserRoles = async () => [{ role: "rider", countryCode: "US" }];
    if (condition === "currency") f.context.storage.getRiderWallet = async () => ({ id: "wallet-one", currency: "USD", isFrozen: false });
    if (condition === "provider") f.context.paymentApi.isRealPaymentsEnabled = async () => false;
    await handler("post", "/api/wallet/fund", f.context)({ user, body: { amount: 100 } }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(f.initialized(), undefined);
    assert.equal(f.recorded(), undefined);
  }
});
test("database failure before recording the intent cannot contact the provider", async () => {
  const f = fixture(), res = response();
  f.context.walletFundingLedger.createIntent = async () => { throw new Error("database unavailable"); };
  await handler("post", "/api/wallet/fund", f.context)({ user, body: { amount: 100 } }, res);
  assert.equal(f.initialized(), undefined);
  assert.equal(res.statusCode, 400);
});
test("funding receipts are private to their recorded owner", async () => {
  const f = fixture(), fn = handler("get", "/api/wallet/funding/:reference", f.context), res = response();
  await fn({ user: { claims: { sub: "another-user" } }, params: { reference: "ZIBANA_fixture" } }, res);
  assert.equal(res.statusCode, 404);
  const ownerResponse = response();
  await fn({ user, params: { reference: "ZIBANA_fixture" } }, ownerResponse);
  assert.equal(ownerResponse.body.status, "settled");
  assert.equal(ownerResponse.body.amount, 100.25);
  assert.equal(ownerResponse.body.currency, "NGN");
  assert.equal(ownerResponse.body.user_id, undefined);
});
test("callback shows success only after committing the verified settlement", async () => {
  const f = fixture(), res = response();
  await handler("get", "/api/wallet/verify", f.context)({ query: { reference: "ZIBANA_fixture", userId: "attacker" } }, res);
  assert.equal(f.settled()[0], "ZIBANA_fixture");
  assert.match(res.location, /payment=success/);
  f.context.walletFundingLedger.settle = async () => { throw new Error("settlement failed"); };
  const failed = response();
  await handler("get", "/api/wallet/verify", f.context)({ query: { reference: "ZIBANA_fixture" } }, failed);
  assert.match(failed.location, /payment=pending/);
});
test("unconfirmed and unknown payments cannot be settled by the callback", async () => {
  const f = fixture(), res = response();
  f.context.paymentApi.verifyPayment = async () => ({ success: false } as any);
  await handler("get", "/api/wallet/verify", f.context)({ query: { reference: "ZIBANA_fixture" } }, res);
  assert.equal(f.settled(), undefined);
  assert.match(res.location, /payment=pending/);
  f.context.walletFundingLedger.getIntent = async () => null as any;
  const unknown = response();
  await handler("get", "/api/wallet/verify", f.context)({ query: { reference: "unknown" } }, unknown);
  assert.match(unknown.location, /payment=failed/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { getCurrencyFromCountry, getCountryConfig, formatCurrency, walletCurrencyFields, SUPPORTED_COUNTRIES } from "../shared/currency";

test("country mappings retain correct national currencies, including normalization", () => {
  for (const [country,currency] of Object.entries({NG:"NGN",US:"USD",ZA:"ZAR",GH:"GHS",KE:"KES",TZ:"TZS",SN:"XOF",CI:"XOF",CM:"XAF",EG:"EGP",MA:"MAD",SA:"SAR",GB:"GBP",CA:"CAD"})) {
    assert.equal(getCurrencyFromCountry(` ${country.toLowerCase()} `), currency);
  }
  assert.throws(() => getCurrencyFromCountry("XX"));
  assert.throws(() => getCountryConfig("GH"));
  for (const country of SUPPORTED_COUNTRIES) assert.equal(getCountryConfig(country.code).currencyCode, country.currency);
});
test("wallet responses preserve USD, NGN and ZAR instead of relabelling balances", () => {
  for (const currency of ["USD", "NGN", "ZAR"]) {
    const wallet = { currency, balance: "120.50" };
    assert.deepEqual({...wallet, ...walletCurrencyFields(wallet)}, {currency, currencyCode:currency, balance:"120.50"});
  }
});
test("money displays distinguish dollars and handle zero, missing and invalid amounts", () => {
  assert.match(formatCurrency("120.50","USD"), /USD.*120\.50/);
  assert.match(formatCurrency("120.50","CAD"), /CAD.*120\.50/);
  assert.match(formatCurrency(0,"NGN"), /NGN.*0\.00/);
  assert.match(formatCurrency(120,"XOF"), /XOF.*120$/);
  for (const value of [null, undefined, "", "oops", "12oops", Infinity]) assert.equal(formatCurrency(value,"USD"), "—");
});

test("registered rider wallet endpoints return stored currency for every supported account", async () => {
  const { readFile } = await import("node:fs/promises");
  const { transform } = await import("esbuild");
  const source = await readFile(new URL("../server/routes.ts", import.meta.url), "utf8");
  const start = source.indexOf('  // Get rider wallet\n');
  const end = source.indexOf('  // Get payment settings for rider', start);
  assert.ok(start > 0 && end > start);
  for (const currency of ["NGN", "USD", "ZAR"]) {
    const handlers = new Map<string, Function>();
    const storage = {
      getRiderWallet: async () => ({ currency, balance: "120.50", testerWalletBalance: "0" }),
      isUserTester: async () => false,
      getRiderProfile: async () => ({ paymentMethod: "WALLET" }),
    };
    // Run the actual registered handlers with deterministic storage, without touching a database.
    new Function("app", "storage", "isAuthenticated", "requireRole", "getUserCurrency", "walletCurrencyFields", (await transform(source.slice(start,end), {loader:"ts"})).code)(
      {get: (path: string, ...callbacks: Function[]) => handlers.set(path, callbacks.at(-1)!)},
      storage, () => {}, () => () => {}, async () => currency, walletCurrencyFields,
    );
    for (const endpoint of ["/api/rider/wallet", "/api/rider/wallet-info"]) {
      let body: any;
      const res = {json: (data: unknown) => { body=data; }, status: (code: number) => { assert.fail(`Unexpected HTTP ${code}`); }};
      await handlers.get(endpoint)!({user:{claims:{sub:"currency-regression"}}}, res);
      assert.equal(body.currencyCode, currency, endpoint);
      assert.equal(body.currency, currency, endpoint);
      assert.equal(body.mainBalance ?? body.balance, "120.50");
    }
  }
});

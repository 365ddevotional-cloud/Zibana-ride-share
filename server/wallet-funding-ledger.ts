import { randomUUID } from "node:crypto";
import type { PaymentResult } from "./payment-provider";

interface LedgerClient {
  query(text: string, values?: any[]): Promise<{ rows: any[] }>;
  release(): void;
}
interface LedgerPool {
  query(text: string, values?: any[]): Promise<{ rows: any[] }>;
  connect(): Promise<LedgerClient>;
}

export const WALLET_FUNDING_SCHEMA = `
CREATE TABLE IF NOT EXISTS wallet_payment_intents (
  reference varchar(150) PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id),
  wallet_id varchar NOT NULL REFERENCES rider_wallets(id),
  email text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 10000 AND amount_minor <= 9999999999),
  currency varchar(3) NOT NULL CHECK (currency = 'NGN'),
  status varchar(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'initialized', 'initialization_failed', 'settled')),
  created_at timestamp NOT NULL DEFAULT now(),
  settled_at timestamp
);`;

export function fundingAmountMinor(amount: unknown): number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) throw new Error("Enter a valid funding amount");
  const minor = Math.round(amount * 100);
  if (!Number.isSafeInteger(minor) || minor < 10000 || minor > 9999999999 ||
      Math.abs(amount * 100 - minor) > 0.000001) {
    throw new Error("Enter an NGN amount of at least 100 with no more than two decimal places");
  }
  return minor;
}

export function createWalletFundingLedger(pool: LedgerPool) {
  let schemaReady: Promise<unknown> | undefined;
  async function ensureSchema() {
    schemaReady ??= pool.query(WALLET_FUNDING_SCHEMA).catch(error => { schemaReady = undefined; throw error; });
    await schemaReady;
  }
  async function getIntent(reference: string) {
    await ensureSchema();
    const result = await pool.query("SELECT * FROM wallet_payment_intents WHERE reference = $1", [reference]);
    return result.rows[0] || null;
  }
  return {
    getIntent,
    async createIntent(userId: string, walletId: string, email: string, amount: unknown) {
      const amountMinor = fundingAmountMinor(amount);
      if (!email || !userId || !walletId) throw new Error("Account and wallet are required");
      await ensureSchema();
      const reference = `ZIBANA_${randomUUID()}`;
      // Capture the account, amount and currency before contacting the payment provider.
      const result = await pool.query(`
        INSERT INTO wallet_payment_intents (reference, user_id, wallet_id, email, amount_minor, currency)
        SELECT $1::varchar, $2::varchar, id, $4::text, $5::bigint, currency FROM rider_wallets
        WHERE id = $3::varchar AND user_id = $2::varchar AND currency = 'NGN' AND is_frozen = false
        RETURNING *`, [reference, userId, walletId, email.trim().toLowerCase(), amountMinor]);
      if (!result.rows[0]) throw new Error("An unfrozen NGN wallet belonging to your account is required");
      return result.rows[0];
    },
    async markInitialized(reference: string, succeeded: boolean) {
      await ensureSchema();
      // A fast webhook may already have settled the intent; never overwrite it.
      await pool.query(`UPDATE wallet_payment_intents SET status = $2
        WHERE reference = $1 AND status = 'pending'`, [reference, succeeded ? "initialized" : "initialization_failed"]);
    },
    async settle(reference: string, verified: PaymentResult) {
      await ensureSchema();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const intents = await client.query("SELECT * FROM wallet_payment_intents WHERE reference = $1 FOR UPDATE", [reference]);
        const intent = intents.rows[0];
        if (!intent) throw new Error("Payment intent not found");
        if (!verified.success || verified.status !== "verified" || verified.transactionRef !== reference ||
            verified.userId !== intent.user_id || verified.currency !== intent.currency ||
            verified.purpose !== "wallet_funding" || verified.email?.trim().toLowerCase() !== intent.email ||
            typeof verified.amount !== "number" || fundingAmountMinor(verified.amount) !== Number(intent.amount_minor)) {
          throw new Error("Verified payment does not match the funding intent");
        }
        if (intent.status === "settled") {
          await client.query("COMMIT");
          return { credited: false, alreadySettled: true };
        }
        const wallets = await client.query(`SELECT id, currency FROM rider_wallets
          WHERE id = $1 AND user_id = $2 FOR UPDATE`, [intent.wallet_id, intent.user_id]);
        if (wallets.rows[0]?.currency !== intent.currency) throw new Error("Payment wallet currency or owner changed");
        // Database numeric arithmetic preserves cents. Wallet credit, receipt and intent commit together.
        const amount = (Number(intent.amount_minor) / 100).toFixed(2);
        await client.query(`UPDATE rider_wallets SET balance = balance + $2::numeric, updated_at = now()
          WHERE id = $1`, [intent.wallet_id, amount]);
        await client.query(`INSERT INTO rider_transaction_history
          (id, rider_id, type, amount, source, reference_id, description)
          VALUES ($1, $2, 'credit', $3, 'adjustment', $4, $5)`,
          [randomUUID(), intent.user_id, amount, reference, "Paystack wallet funding (NGN)"]);
        await client.query(`UPDATE wallet_payment_intents SET status = 'settled', settled_at = now()
          WHERE reference = $1`, [reference]);
        await client.query("COMMIT");
        return { credited: true, alreadySettled: false };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

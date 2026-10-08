import { COUNTRY_PROFILES } from "./country-profiles";

// Display mappings cover the country profiles; launch availability is separate.
export const COUNTRY_CURRENCY_MAP: Record<string, string> = Object.fromEntries(
  Object.values(COUNTRY_PROFILES).map(p => [p.countryCode, p.currency]),
);
export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "US$", ZAR: "R", GHS: "GH₵", KES: "KSh", TZS: "TSh",
  XOF: "CFA", XAF: "FCFA", EGP: "E£", MAD: "DH", SAR: "SAR", GBP: "£", CAD: "CA$",
};
export function getCurrencyFromCountry(countryCode: string): string {
  const currency = COUNTRY_CURRENCY_MAP[countryCode.trim().toUpperCase()];
  if (!currency) throw new Error("Unsupported country currency");
  return currency;
}
export function getCurrencySymbol(currencyCode: string): string {
  const code = currencyCode.trim().toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
}

// Amounts are major currency units. Do not convert or relabel stored balances.
export function formatCurrency(amount: number | string | null | undefined, currencyCode: string): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = Number(amount);
  const code = currencyCode.trim().toUpperCase();
  if (!Number.isFinite(value) || !/^[A-Z]{3}$/.test(code)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, currencyDisplay: "code" }).format(value);
  } catch { return "—"; }
}

export function walletCurrencyFields(wallet: { currency: string }) {
  return { currency: wallet.currency, currencyCode: wallet.currency };
}

// Supported countries list
export const SUPPORTED_COUNTRIES = [
  { code: "NG", name: "Nigeria", currency: "NGN", symbol: "₦" },
  { code: "US", name: "United States", currency: "USD", symbol: "$" },
  { code: "ZA", name: "South Africa", currency: "ZAR", symbol: "R" },
];

// ===========================================
// GLOBAL COUNTRY CONFIG MAP (FINANCIAL ENGINE)
// ===========================================

export interface CountryFinancialConfig {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  minRideFare: number;
  minWithdrawalAmount: number;
  minBalanceForRide: number;
}

export const COUNTRY_FINANCIAL_CONFIG: Record<string, CountryFinancialConfig> = {
  NG: {
    countryCode: "NG",
    countryName: "Nigeria",
    currencyCode: "NGN",
    currencySymbol: "₦",
    minRideFare: 500,
    minWithdrawalAmount: 1000,
    minBalanceForRide: 5,
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    currencyCode: "USD",
    currencySymbol: "$",
    minRideFare: 5,
    minWithdrawalAmount: 10,
    minBalanceForRide: 1,
  },
  ZA: {
    countryCode: "ZA",
    countryName: "South Africa",
    currencyCode: "ZAR",
    currencySymbol: "R",
    minRideFare: 50,
    minWithdrawalAmount: 100,
    minBalanceForRide: 5,
  },
};

// Get country config with defaults
export function getCountryConfig(countryCode: string): CountryFinancialConfig {
  const config = COUNTRY_FINANCIAL_CONFIG[countryCode.trim().toUpperCase()];
  if (!config) throw new Error("Financial services are not configured for this country");
  return config;
}

// ===========================================
// IMMUTABLE REVENUE SPLIT CONSTANTS
// ===========================================

export const DRIVER_SHARE_PERCENT = 80;
export const PLATFORM_SHARE_PERCENT = 20;

// Calculate revenue split with integer-safe math (no rounding drift)
export function calculateRevenueSplit(fareAmount: number): {
  driverPayout: number;
  commissionAmount: number;
} {
  const driverPayout = Math.floor((fareAmount * DRIVER_SHARE_PERCENT) / 100 * 100) / 100;
  const commissionAmount = Math.floor((fareAmount * PLATFORM_SHARE_PERCENT) / 100 * 100) / 100;
  return { driverPayout, commissionAmount };
}

// ===========================================
// FINANCIAL ENGINE LOCK FLAG
// ===========================================

export const FINANCIAL_ENGINE_LOCKED = true;

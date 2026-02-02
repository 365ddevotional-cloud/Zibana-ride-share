// Country to Currency mapping
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  NG: "NGN",
  US: "USD",
  ZA: "ZAR",
};

// Currency symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  ZAR: "R",
};

// Get currency code from country code
export function getCurrencyFromCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode] || "NGN";
}

// Get currency symbol
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

// Format amount with currency
export function formatCurrency(amount: number | string, currencyCode: string): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const symbol = getCurrencySymbol(currencyCode);
  
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
    
    return `${symbol}${formatted}`;
  } catch {
    return `${symbol}${numAmount.toFixed(2)}`;
  }
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
  return COUNTRY_FINANCIAL_CONFIG[countryCode] || COUNTRY_FINANCIAL_CONFIG.NG;
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

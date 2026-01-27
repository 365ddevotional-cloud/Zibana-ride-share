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

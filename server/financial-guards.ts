import { getCountryConfig, FINANCIAL_ENGINE_LOCKED, DRIVER_SHARE_PERCENT, PLATFORM_SHARE_PERCENT } from "../shared/currency";

export interface RideRequestGuardInput {
  userId: string;
  isTester: boolean;
  walletCurrency: string;
  tripCurrency: string;
  countryCode: string;
  availableBalance: number;
  walletFrozen: boolean;
  userSuspended: boolean;
  resolvedPaymentSource: "TEST_WALLET" | "MAIN_WALLET" | "CARD" | "BANK";
}

export interface GuardRejection {
  allowed: false;
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface GuardApproval {
  allowed: true;
}

export type GuardResult = GuardRejection | GuardApproval;

export function validateRideRequest(input: RideRequestGuardInput): GuardResult {
  const countryConfig = getCountryConfig(input.countryCode);

  if (input.walletFrozen) {
    logGuardRejection("WALLET_FROZEN", input);
    return {
      allowed: false,
      code: "WALLET_FROZEN",
      message: "Your wallet is frozen. Please contact support.",
    };
  }

  if (input.userSuspended) {
    logGuardRejection("USER_SUSPENDED", input);
    return {
      allowed: false,
      code: "USER_SUSPENDED",
      message: "Your account is suspended. Please contact support.",
    };
  }

  if (input.walletCurrency !== input.tripCurrency) {
    logGuardRejection("CURRENCY_MISMATCH", input);
    return {
      allowed: false,
      code: "CURRENCY_MISMATCH",
      message: `Currency mismatch: Your wallet is ${input.walletCurrency} but trip is ${input.tripCurrency}`,
      details: {
        walletCurrency: input.walletCurrency,
        tripCurrency: input.tripCurrency,
      },
    };
  }

  if (input.isTester && input.resolvedPaymentSource !== "TEST_WALLET") {
    logGuardRejection("TESTER_INVALID_SOURCE", input);
    return {
      allowed: false,
      code: "INVALID_PAYMENT_SOURCE",
      message: "Test users must use TEST_WALLET",
    };
  }

  if (!input.isTester && input.resolvedPaymentSource === "TEST_WALLET") {
    logGuardRejection("NON_TESTER_TEST_WALLET", input);
    return {
      allowed: false,
      code: "INVALID_PAYMENT_SOURCE",
      message: "Regular users cannot use TEST_WALLET",
    };
  }

  if (input.availableBalance < countryConfig.minBalanceForRide) {
    logGuardRejection("INSUFFICIENT_BALANCE", input);
    return {
      allowed: false,
      code: "INSUFFICIENT_BALANCE",
      message: `Minimum balance required: ${countryConfig.currencySymbol}${countryConfig.minBalanceForRide}`,
      details: {
        required: countryConfig.minBalanceForRide,
        available: input.availableBalance,
        currency: countryConfig.currencyCode,
      },
    };
  }

  return { allowed: true };
}

function logGuardRejection(reasonCode: string, input: RideRequestGuardInput): void {
  console.log(
    `[FINANCIAL_GUARD_REJECTION] code=${reasonCode}, userId=${input.userId}, ` +
    `countryCode=${input.countryCode}, isTester=${input.isTester}, ` +
    `paymentSource=${input.resolvedPaymentSource}, balance=${input.availableBalance}`
  );
}

export function assertFinancialEngineLocked(): void {
  if (!FINANCIAL_ENGINE_LOCKED) {
    throw new Error("CRITICAL: Financial engine is not locked. This is a security violation.");
  }
}

export { FINANCIAL_ENGINE_LOCKED, DRIVER_SHARE_PERCENT, PLATFORM_SHARE_PERCENT };

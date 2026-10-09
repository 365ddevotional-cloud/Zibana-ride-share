/**
 * Payment Provider Abstraction Layer
 * ZIBANA uses WALLET + ESCROW model
 * 
 * ==============================
 * COUNTRY-SPECIFIC PAYMENT MODE
 * ==============================
 * - Nigeria (NG): REAL PAYMENTS via Paystack
 * - Unsupported countries: unavailable in production; explicit simulation in development only
 * - Driver payouts: MANUAL only (no auto payouts)
 */

import { storage } from "./storage";
import { randomUUID } from "node:crypto";

// Country-specific payment mode (not global)
// Nigeria uses real payments, others are simulated
export type PaymentProvider = "paystack" | "flutterwave" | "manual" | "placeholder";

export interface PaymentResult {
  success: boolean;
  status?: "initialized" | "verified" | "simulated";
  amount?: number;
  currency?: string;
  userId?: string;
  email?: string;
  purpose?: string;
  transactionRef?: string;
  authorizationUrl?: string;
  accessCode?: string;
  message?: string;
  error?: string;
}

export interface PaymentRequest {
  amount: number; // Major currency units (NGN); converted to kobo once at the provider boundary
  currency: string;
  userId: string;
  email?: string;
  description?: string;
  callbackUrl?: string;
  transactionRef?: string;
  purpose?: "wallet_funding" | "card_authorization";
}

export interface WithdrawalRequest {
  amount: number;
  currency: string;
  userId: string;
  accountNumber?: string;
  bankCode?: string;
  recipientName?: string;
}

interface PaymentProviderAdapter {
  name: PaymentProvider;
  enabled: boolean;
  initializePayment(request: PaymentRequest): Promise<PaymentResult>;
  verifyPayment(transactionRef: string): Promise<PaymentResult>;
  initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult>;
}

// Real Paystack Integration for Nigeria
class PaystackAdapter implements PaymentProviderAdapter {
  name: PaymentProvider = "paystack";
  enabled = true;
  
  private getSecretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY || "";
  }
  
  async initializePayment(request: PaymentRequest): Promise<PaymentResult> {
    const secretKey = this.getSecretKey();
    
    if (!secretKey) {
      console.error("[Paystack] ERROR: No secret key configured");
      return {
        success: false,
        error: "Payment provider not configured. Please contact support.",
      };
    }
    
    const amountMinor = Math.round(request.amount * 100);
    if (request.currency !== "NGN" || !Number.isFinite(request.amount) || request.amount <= 0 ||
        !Number.isSafeInteger(amountMinor) || amountMinor > 9999999999 ||
        Math.abs(request.amount * 100 - amountMinor) > 0.000001 || !request.email || !request.userId) {
      return { success: false, error: "A valid NGN amount, account and email are required" };
    }
    if (process.env.NODE_ENV === "production" && !secretKey.startsWith("sk_live_")) {
      return { success: false, error: "Live payments are not configured" };
    }
    const reference = request.transactionRef || `ZIBANA_${randomUUID()}`;
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(reference)) return { success: false, error: "Invalid payment reference" };
    try {
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: request.email,
          amount: amountMinor, // Convert NGN to kobo exactly once
          currency: request.currency || "NGN",
          reference,
          callback_url: request.callbackUrl,
          metadata: {
            userId: request.userId,
            description: request.description || "Wallet Funding",
            purpose: request.purpose,
          },
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === true && data.data?.reference === reference && data.data?.authorization_url) {
        console.log(`[Paystack] Payment initialized: ${data.data.reference}`);
        return {
          success: true,
          status: "initialized",
          transactionRef: data.data.reference,
          authorizationUrl: data.data.authorization_url,
          accessCode: data.data.access_code,
          message: "Payment initialized",
        };
      } else {
        console.error(`[Paystack] Init failed: ${data.message}`);
        return {
          success: false,
          error: data.message || "Payment initialization failed",
        };
      }
    } catch (error: any) {
      console.error(`[Paystack] Network error:`, error.message);
      return {
        success: false,
        error: "Payment service temporarily unavailable",
      };
    }
  }
  
  async verifyPayment(transactionRef: string): Promise<PaymentResult> {
    const secretKey = this.getSecretKey();
    
    if (!secretKey) {
      return { success: false, error: "Payment provider not configured" };
    }
    
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(transactionRef)) {
      return { success: false, error: "Invalid payment reference" };
    }
    if (process.env.NODE_ENV === "production" && !secretKey.startsWith("sk_live_")) {
      return { success: false, error: "Live payments are not configured" };
    }
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(transactionRef)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === true && data.data?.status === "success" &&
          data.data.reference === transactionRef && data.data.currency === "NGN" &&
          Number.isSafeInteger(data.data.amount) && data.data.amount > 0 &&
          typeof data.data.metadata?.userId === "string" && data.data.metadata.userId.length > 0 &&
          (process.env.NODE_ENV !== "production" || data.data.domain === "live")) {
        console.log(`[Paystack] Payment verified: ${transactionRef}`);
        return {
          success: true,
          status: "verified",
          amount: data.data.amount / 100,
          currency: data.data.currency,
          userId: data.data.metadata.userId,
          email: data.data.customer?.email,
          purpose: data.data.metadata.purpose,
          transactionRef,
          message: `Payment verified: ${data.data.amount / 100} ${data.data.currency}`,
        };
      } else {
        console.log(`[Paystack] Payment not successful: ${data.data?.status || "unknown"}`);
        return {
          success: false,
          transactionRef,
          error: `Payment status: ${data.data?.status || "failed"}`,
        };
      }
    } catch (error: any) {
      console.error(`[Paystack] Verify error:`, error.message);
      return {
        success: false,
        error: "Verification failed",
      };
    }
  }
  
  async initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
    // Driver payouts are MANUAL ONLY - no auto transfers
    console.log(`[Paystack] Withdrawal request logged (MANUAL PROCESSING REQUIRED)`);
    console.log(`[Paystack] Amount: ${request.amount} ${request.currency}, User: ${request.userId}`);
    
    return {
      success: true,
      transactionRef: `MANUAL_${Date.now()}`,
      message: "Payout logged for manual processing. No auto transfers enabled.",
    };
  }
}

class FlutterwaveAdapter implements PaymentProviderAdapter {
  name: PaymentProvider = "flutterwave";
  enabled = false; // Disabled - not used
  
  async initializePayment(request: PaymentRequest): Promise<PaymentResult> {
    return { success: false, error: "Flutterwave not enabled" };
  }
  
  async verifyPayment(transactionRef: string): Promise<PaymentResult> {
    return { success: false, error: "Flutterwave not enabled" };
  }
  
  async initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
    return { success: false, error: "Flutterwave not enabled" };
  }
}

class ManualAdapter implements PaymentProviderAdapter {
  name: PaymentProvider = "manual";
  enabled = true;
  
  async initializePayment(request: PaymentRequest): Promise<PaymentResult> {
    const transactionRef = `MAN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[Manual] Payment recorded: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionRef,
      message: "Manual payment recorded",
    };
  }
  
  async verifyPayment(transactionRef: string): Promise<PaymentResult> {
    return { success: true, transactionRef, message: "Manual payment verified" };
  }
  
  async initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
    const transactionRef = `MAN_WD_${Date.now()}`;
    console.log(`[Manual] Withdrawal recorded: ${request.amount} ${request.currency}`);
    return { success: true, transactionRef, message: "Manual withdrawal recorded" };
  }
}

// Simulated/Placeholder for countries without real payments
class PlaceholderAdapter implements PaymentProviderAdapter {
  name: PaymentProvider = "placeholder";
  enabled = true;
  
  async initializePayment(request: PaymentRequest): Promise<PaymentResult> {
    const transactionRef = `SIM_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[Simulated] Payment: ${request.amount} ${request.currency} (SIMULATED MODE)`);
    return {
      success: true,
      transactionRef,
      message: "Payment processed (SIMULATED MODE - no real charge)",
    };
  }
  
  async verifyPayment(transactionRef: string): Promise<PaymentResult> {
    console.log(`[Simulated] Verify: ${transactionRef} (SIMULATED MODE)`);
    return {
      success: true,
      transactionRef,
      message: "Payment verified (SIMULATED MODE)",
    };
  }
  
  async initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
    const transactionRef = `SIM_WD_${Date.now()}`;
    console.log(`[Simulated] Withdrawal: ${request.amount} ${request.currency} (SIMULATED MODE)`);
    return {
      success: true,
      transactionRef,
      message: "Withdrawal processed (SIMULATED MODE)",
    };
  }
}

const adapters: Record<PaymentProvider, PaymentProviderAdapter> = {
  paystack: new PaystackAdapter(),
  flutterwave: new FlutterwaveAdapter(),
  manual: new ManualAdapter(),
  placeholder: new PlaceholderAdapter(),
};

export function getPaymentProvider(providerName: PaymentProvider): PaymentProviderAdapter {
  // An unknown or simulated provider must never become a production payment success.
  if (process.env.NODE_ENV === "production" && providerName !== "paystack") {
    return adapters.flutterwave; // Disabled adapter returns an explicit failure.
  }
  return adapters[providerName] || adapters.flutterwave;
}

// Get payment mode for a country from database
export async function getProviderForCountry(countryCode: string): Promise<{
  provider: PaymentProvider;
  paymentsEnabled: boolean;
}> {
  try {
    // Check country payment settings from database
    const countries = await storage.getAllCountriesWithPaymentStatus();
    const country = countries.find(c => c.isoCode === countryCode);
    
    if (country && country.paymentsEnabled && country.paymentProvider === "paystack" && countryCode === "NG" &&
        !!process.env.PAYSTACK_SECRET_KEY &&
        (process.env.NODE_ENV !== "production" || process.env.PAYSTACK_SECRET_KEY.startsWith("sk_live_"))) {
      console.log(`[Payment] Country ${countryCode}: REAL PAYMENTS via ${country.paymentProvider}`);
      return {
        provider: country.paymentProvider as PaymentProvider,
        paymentsEnabled: true,
      };
    }
    
    // Unconfigured providers are unavailable; simulation is explicitly gated below
    console.log(`[Payment] Country ${countryCode}: provider unavailable`);
    return {
      provider: "placeholder",
      paymentsEnabled: false,
    };
  } catch (error) {
    console.error(`[Payment] Error checking country ${countryCode}:`, error);
    return { provider: "placeholder", paymentsEnabled: false };
  }
}

export async function processPayment(
  countryCode: string,
  request: PaymentRequest
): Promise<PaymentResult> {
  const { provider, paymentsEnabled } = await getProviderForCountry(countryCode);
  
  if (!paymentsEnabled) {
    if (process.env.NODE_ENV === "production" || process.env.SIMULATION_MODE_ENABLED !== "true") {
      return { success: false, error: "Payments are unavailable in this country" };
    }
    // Explicit non-production simulation only
    const adapter = adapters.placeholder;
    console.log(`[Payment] Simulated payment for ${request.userId} in ${countryCode}`);
    return adapter.initializePayment(request);
  }
  
  // Real payment processing
  const adapter = getPaymentProvider(provider);
  if (!adapter.enabled) {
    console.error(`[Payment] Provider ${provider} is disabled`);
    return { success: false, error: "Payment provider not available" };
  }
  
  const result = await adapter.initializePayment(request);
  
  // Failsafe: If real payment fails, log error but don't auto-revert
  if (!result.success) {
    console.error(`[Payment] FAILED for ${countryCode}: ${result.error}`);
    // Never fall back from failed real payments to a simulated success.
  }
  
  return result;
}

export async function verifyPayment(
  countryCode: string,
  transactionRef: string
): Promise<PaymentResult> {
  const { provider, paymentsEnabled } = await getProviderForCountry(countryCode);
  
  if (!paymentsEnabled) {
    if (process.env.NODE_ENV === "production" || process.env.SIMULATION_MODE_ENABLED !== "true") {
      return { success: false, error: "Payments are unavailable in this country" };
    }
    return adapters.placeholder.verifyPayment(transactionRef);
  }
  
  const adapter = getPaymentProvider(provider);
  return adapter.verifyPayment(transactionRef);
}

export async function processWithdrawal(
  countryCode: string,
  request: WithdrawalRequest
): Promise<PaymentResult> {
  // This adapter cannot persist or settle a withdrawal. Use the recorded admin workflow.
  return { success: false, error: "Use the verified withdrawal request workflow" };
}

// Check if a country has real payments enabled
export async function isRealPaymentsEnabled(countryCode: string): Promise<boolean> {
  const { paymentsEnabled } = await getProviderForCountry(countryCode);
  return paymentsEnabled;
}

// Get payment status summary for admin dashboard
export async function getPaymentStatusSummary(): Promise<{
  countries: Array<{ code: string; name: string; mode: string; provider: string | null }>;
  launchMode: string;
  driverPayouts: string;
}> {
  const countries = await storage.getAllCountriesWithPaymentStatus();
  const launchMode = await storage.getSystemConfig("LAUNCH_MODE");
  
  return {
    countries: await Promise.all(countries.map(async c => {
      const ready = await isRealPaymentsEnabled(c.isoCode);
      return {
        code: c.isoCode,
        name: c.name,
        mode: ready ? "REAL PAYMENTS" : "UNAVAILABLE",
        provider: ready ? c.paymentProvider : null,
      };
    })),
    launchMode: launchMode || "soft_launch",
    driverPayouts: "MANUAL",
  };
}

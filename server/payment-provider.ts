/**
 * Payment Provider Abstraction Layer
 * ZIBA uses WALLET + ESCROW model
 * 
 * ==============================
 * COUNTRY-SPECIFIC PAYMENT MODE
 * ==============================
 * - Nigeria (NG): REAL PAYMENTS via Paystack
 * - All other countries: WALLET-SIMULATED mode
 * - Driver payouts: MANUAL only (no auto payouts)
 */

import { storage } from "./storage";

// Country-specific payment mode (not global)
// Nigeria uses real payments, others are simulated
export type PaymentProvider = "paystack" | "flutterwave" | "manual" | "placeholder";

export interface PaymentResult {
  success: boolean;
  transactionRef?: string;
  authorizationUrl?: string;
  accessCode?: string;
  message?: string;
  error?: string;
}

export interface PaymentRequest {
  amount: number; // In smallest currency unit (kobo for NGN)
  currency: string;
  userId: string;
  email?: string;
  description?: string;
  callbackUrl?: string;
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
    
    try {
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: request.email,
          amount: Math.round(request.amount * 100), // Convert to kobo
          currency: request.currency || "NGN",
          reference: `ZIBA_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          callback_url: request.callbackUrl,
          metadata: {
            userId: request.userId,
            description: request.description || "Wallet Funding",
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.status === true && data.data) {
        console.log(`[Paystack] Payment initialized: ${data.data.reference}`);
        return {
          success: true,
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
    
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${transactionRef}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
        },
      });
      
      const data = await response.json();
      
      if (data.status === true && data.data && data.data.status === "success") {
        console.log(`[Paystack] Payment verified: ${transactionRef}`);
        return {
          success: true,
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
  return adapters[providerName] || adapters.placeholder;
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
    
    if (country && country.paymentsEnabled && country.paymentProvider) {
      console.log(`[Payment] Country ${countryCode}: REAL PAYMENTS via ${country.paymentProvider}`);
      return {
        provider: country.paymentProvider as PaymentProvider,
        paymentsEnabled: true,
      };
    }
    
    // Default: simulated mode for countries without payments enabled
    console.log(`[Payment] Country ${countryCode}: SIMULATED MODE`);
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
    // Use simulated mode
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
    console.log(`[Payment] Consider reverting ${countryCode} to simulated mode if issues persist`);
  }
  
  return result;
}

export async function verifyPayment(
  countryCode: string,
  transactionRef: string
): Promise<PaymentResult> {
  const { provider, paymentsEnabled } = await getProviderForCountry(countryCode);
  
  if (!paymentsEnabled) {
    return adapters.placeholder.verifyPayment(transactionRef);
  }
  
  const adapter = getPaymentProvider(provider);
  return adapter.verifyPayment(transactionRef);
}

export async function processWithdrawal(
  countryCode: string,
  request: WithdrawalRequest
): Promise<PaymentResult> {
  // Driver payouts are ALWAYS manual - no auto transfers
  console.log(`[Payout] MANUAL processing required for ${request.userId}`);
  console.log(`[Payout] Amount: ${request.amount} ${request.currency}`);
  
  return {
    success: true,
    transactionRef: `MANUAL_${Date.now()}`,
    message: "Payout logged for manual admin processing. No auto transfers enabled.",
  };
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
    countries: countries.map(c => ({
      code: c.isoCode,
      name: c.name,
      mode: c.paymentsEnabled ? "REAL PAYMENTS" : "SIMULATED",
      provider: c.paymentsEnabled ? c.paymentProvider : null,
    })),
    launchMode: launchMode || "soft_launch",
    driverPayouts: "MANUAL",
  };
}

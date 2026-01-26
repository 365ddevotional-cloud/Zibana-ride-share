/**
 * Payment Provider Abstraction Layer
 * ZIBA uses WALLET + ESCROW model
 * Supports: Paystack (Nigeria), Flutterwave (Nigeria), Manual, Placeholder (other countries)
 */

export type PaymentProvider = "paystack" | "flutterwave" | "manual" | "placeholder";

export interface PaymentResult {
  success: boolean;
  transactionRef?: string;
  message?: string;
  error?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  userId: string;
  email?: string;
  description?: string;
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

class PaystackAdapter implements PaymentProviderAdapter {
  name: PaymentProvider = "paystack";
  enabled = true;
  
  async initializePayment(request: PaymentRequest): Promise<PaymentResult> {
    const transactionRef = `PSK_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[Paystack] Initialize payment: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionRef,
      message: "Payment initialized (simulated)",
    };
  }
  
  async verifyPayment(transactionRef: string): Promise<PaymentResult> {
    console.log(`[Paystack] Verify payment: ${transactionRef}`);
    return {
      success: true,
      transactionRef,
      message: "Payment verified (simulated)",
    };
  }
  
  async initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
    const transactionRef = `PSK_WD_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[Paystack] Initiate withdrawal: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionRef,
      message: "Withdrawal initiated (simulated)",
    };
  }
}

class FlutterwaveAdapter implements PaymentProviderAdapter {
  name: PaymentProvider = "flutterwave";
  enabled = true;
  
  async initializePayment(request: PaymentRequest): Promise<PaymentResult> {
    const transactionRef = `FLW_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[Flutterwave] Initialize payment: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionRef,
      message: "Payment initialized (simulated)",
    };
  }
  
  async verifyPayment(transactionRef: string): Promise<PaymentResult> {
    console.log(`[Flutterwave] Verify payment: ${transactionRef}`);
    return {
      success: true,
      transactionRef,
      message: "Payment verified (simulated)",
    };
  }
  
  async initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
    const transactionRef = `FLW_WD_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[Flutterwave] Initiate withdrawal: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionRef,
      message: "Withdrawal initiated (simulated)",
    };
  }
}

class ManualAdapter implements PaymentProviderAdapter {
  name: PaymentProvider = "manual";
  enabled = true;
  
  async initializePayment(request: PaymentRequest): Promise<PaymentResult> {
    const transactionRef = `MAN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[Manual] Initialize payment: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionRef,
      message: "Manual payment recorded",
    };
  }
  
  async verifyPayment(transactionRef: string): Promise<PaymentResult> {
    return {
      success: true,
      transactionRef,
      message: "Manual payment verified",
    };
  }
  
  async initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
    const transactionRef = `MAN_WD_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[Manual] Initiate withdrawal: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionRef,
      message: "Manual withdrawal initiated",
    };
  }
}

class PlaceholderAdapter implements PaymentProviderAdapter {
  name: PaymentProvider = "placeholder";
  enabled = false;
  
  async initializePayment(_request: PaymentRequest): Promise<PaymentResult> {
    return {
      success: false,
      error: "Payment provider not available for this region",
    };
  }
  
  async verifyPayment(_transactionRef: string): Promise<PaymentResult> {
    return {
      success: false,
      error: "Payment provider not available for this region",
    };
  }
  
  async initiateWithdrawal(_request: WithdrawalRequest): Promise<PaymentResult> {
    return {
      success: false,
      error: "Payment provider not available for this region",
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

export function getProviderForCountry(countryCode: string): PaymentProvider {
  const countryProviders: Record<string, PaymentProvider> = {
    NG: "paystack",
    GH: "placeholder",
    KE: "placeholder",
    ZA: "placeholder",
  };
  return countryProviders[countryCode] || "placeholder";
}

export async function processPayment(
  provider: PaymentProvider,
  request: PaymentRequest
): Promise<PaymentResult> {
  const adapter = getPaymentProvider(provider);
  if (!adapter.enabled) {
    return {
      success: false,
      error: "Payment provider not enabled for this region",
    };
  }
  return adapter.initializePayment(request);
}

export async function processWithdrawal(
  provider: PaymentProvider,
  request: WithdrawalRequest
): Promise<PaymentResult> {
  const adapter = getPaymentProvider(provider);
  if (!adapter.enabled) {
    return {
      success: false,
      error: "Payment provider not enabled for this region",
    };
  }
  return adapter.initiateWithdrawal(request);
}

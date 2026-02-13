/**
 * Payout Provider Abstraction Layer
 * ZIBANA uses provider abstraction for driver payouts
 * 
 * Supported Providers:
 * - Paystack (Nigeria - Default)
 * - Flutterwave (Nigeria - Fallback)
 * - Manual (Test/Fallback mode)
 */

import crypto from "crypto";

export type PayoutProviderName = "paystack" | "flutterwave" | "manual";

export type TransferStatus = "pending" | "success" | "failed" | "reversed";

export interface BankVerificationResult {
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  reference?: string;
  providerReference?: string;
  status?: TransferStatus;
  message?: string;
  error?: string;
}

export interface TransferStatusResult {
  success: boolean;
  status?: TransferStatus;
  reference?: string;
  amount?: number;
  currency?: string;
  message?: string;
  error?: string;
}

export interface PayoutProvider {
  name: PayoutProviderName;
  verifyBankAccount(bankCode: string, accountNumber: string): Promise<BankVerificationResult>;
  initiateTransfer(params: {
    amountNGN: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    reference: string;
    narration?: string;
  }): Promise<TransferResult>;
  getTransferStatus(reference: string): Promise<TransferStatusResult>;
}

class PaystackPayoutProvider implements PayoutProvider {
  name: PayoutProviderName = "paystack";

  private getSecretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY || "";
  }

  async verifyBankAccount(bankCode: string, accountNumber: string): Promise<BankVerificationResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return { success: false, error: "Paystack not configured" };
    }

    try {
      const url = `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
        },
      });

      const data = await response.json();

      if (data.status === true && data.data) {
        console.log(`[Paystack] Bank account verified: ${data.data.account_name}`);
        return {
          success: true,
          accountName: data.data.account_name,
          accountNumber: data.data.account_number,
          bankCode: bankCode,
        };
      } else {
        console.error(`[Paystack] Bank verification failed: ${data.message}`);
        return { success: false, error: data.message || "Bank verification failed" };
      }
    } catch (error: any) {
      console.error(`[Paystack] Bank verification error:`, error.message);
      return { success: false, error: "Bank verification service unavailable" };
    }
  }

  async initiateTransfer(params: {
    amountNGN: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    reference: string;
    narration?: string;
  }): Promise<TransferResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return { success: false, error: "Paystack not configured" };
    }

    try {
      // Step 1: Create transfer recipient
      const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: params.accountName,
          account_number: params.accountNumber,
          bank_code: params.bankCode,
          currency: "NGN",
        }),
      });

      const recipientData = await recipientResponse.json();

      if (!recipientData.status || !recipientData.data?.recipient_code) {
        console.error(`[Paystack] Recipient creation failed: ${recipientData.message}`);
        return { success: false, error: recipientData.message || "Failed to create transfer recipient" };
      }

      const recipientCode = recipientData.data.recipient_code;

      // Step 2: Initiate transfer
      const transferResponse = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: Math.round(params.amountNGN * 100), // Convert to kobo
          recipient: recipientCode,
          reason: params.narration || `ZIBANA Payout - ${params.reference}`,
          reference: params.reference,
        }),
      });

      const transferData = await transferResponse.json();

      if (transferData.status === true && transferData.data) {
        const status = this.mapPaystackStatus(transferData.data.status);
        console.log(`[Paystack] Transfer initiated: ${params.reference}, status: ${status}`);
        return {
          success: true,
          reference: params.reference,
          providerReference: transferData.data.transfer_code,
          status: status,
          message: transferData.message,
        };
      } else {
        console.error(`[Paystack] Transfer failed: ${transferData.message}`);
        return { success: false, error: transferData.message || "Transfer failed" };
      }
    } catch (error: any) {
      console.error(`[Paystack] Transfer error:`, error.message);
      return { success: false, error: "Transfer service unavailable" };
    }
  }

  async getTransferStatus(reference: string): Promise<TransferStatusResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return { success: false, error: "Paystack not configured" };
    }

    try {
      const response = await fetch(`https://api.paystack.co/transfer/verify/${reference}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
        },
      });

      const data = await response.json();

      if (data.status === true && data.data) {
        const status = this.mapPaystackStatus(data.data.status);
        return {
          success: true,
          status: status,
          reference: reference,
          amount: data.data.amount / 100, // Convert from kobo
          currency: "NGN",
          message: data.message,
        };
      } else {
        return { success: false, error: data.message || "Transfer status check failed" };
      }
    } catch (error: any) {
      console.error(`[Paystack] Status check error:`, error.message);
      return { success: false, error: "Status check service unavailable" };
    }
  }

  private mapPaystackStatus(paystackStatus: string): TransferStatus {
    switch (paystackStatus.toLowerCase()) {
      case "success":
        return "success";
      case "failed":
        return "failed";
      case "reversed":
        return "reversed";
      case "pending":
      case "otp":
      default:
        return "pending";
    }
  }
}

class FlutterwavePayoutProvider implements PayoutProvider {
  name: PayoutProviderName = "flutterwave";

  private getSecretKey(): string {
    return process.env.FLW_SECRET_KEY || "";
  }

  async verifyBankAccount(bankCode: string, accountNumber: string): Promise<BankVerificationResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return { success: false, error: "Flutterwave not configured" };
    }

    try {
      const response = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number: accountNumber,
          account_bank: bankCode,
        }),
      });

      const data = await response.json();

      if (data.status === "success" && data.data) {
        console.log(`[Flutterwave] Bank account verified: ${data.data.account_name}`);
        return {
          success: true,
          accountName: data.data.account_name,
          accountNumber: accountNumber,
          bankCode: bankCode,
        };
      } else {
        console.error(`[Flutterwave] Bank verification failed: ${data.message}`);
        return { success: false, error: data.message || "Bank verification failed" };
      }
    } catch (error: any) {
      console.error(`[Flutterwave] Bank verification error:`, error.message);
      return { success: false, error: "Bank verification service unavailable" };
    }
  }

  async initiateTransfer(params: {
    amountNGN: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    reference: string;
    narration?: string;
  }): Promise<TransferResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return { success: false, error: "Flutterwave not configured" };
    }

    try {
      const response = await fetch("https://api.flutterwave.com/v3/transfers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_bank: params.bankCode,
          account_number: params.accountNumber,
          amount: params.amountNGN,
          narration: params.narration || `ZIBANA Payout - ${params.reference}`,
          currency: "NGN",
          reference: params.reference,
          beneficiary_name: params.accountName,
        }),
      });

      const data = await response.json();

      if (data.status === "success" && data.data) {
        const status = this.mapFlutterwaveStatus(data.data.status);
        console.log(`[Flutterwave] Transfer initiated: ${params.reference}, status: ${status}`);
        return {
          success: true,
          reference: params.reference,
          providerReference: String(data.data.id),
          status: status,
          message: data.message,
        };
      } else {
        console.error(`[Flutterwave] Transfer failed: ${data.message}`);
        return { success: false, error: data.message || "Transfer failed" };
      }
    } catch (error: any) {
      console.error(`[Flutterwave] Transfer error:`, error.message);
      return { success: false, error: "Transfer service unavailable" };
    }
  }

  async getTransferStatus(reference: string): Promise<TransferStatusResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return { success: false, error: "Flutterwave not configured" };
    }

    try {
      const response = await fetch(`https://api.flutterwave.com/v3/transfers?reference=${reference}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
        },
      });

      const data = await response.json();

      if (data.status === "success" && data.data && data.data.length > 0) {
        const transfer = data.data[0];
        const status = this.mapFlutterwaveStatus(transfer.status);
        return {
          success: true,
          status: status,
          reference: reference,
          amount: transfer.amount,
          currency: "NGN",
          message: data.message,
        };
      } else {
        return { success: false, error: data.message || "Transfer not found" };
      }
    } catch (error: any) {
      console.error(`[Flutterwave] Status check error:`, error.message);
      return { success: false, error: "Status check service unavailable" };
    }
  }

  private mapFlutterwaveStatus(flwStatus: string): TransferStatus {
    switch (flwStatus.toLowerCase()) {
      case "successful":
        return "success";
      case "failed":
        return "failed";
      case "reversed":
        return "reversed";
      case "pending":
      case "new":
      default:
        return "pending";
    }
  }
}

class ManualPayoutProvider implements PayoutProvider {
  name: PayoutProviderName = "manual";

  async verifyBankAccount(bankCode: string, accountNumber: string): Promise<BankVerificationResult> {
    console.log(`[Manual] Bank verification request: ${bankCode} / ${accountNumber}`);
    return {
      success: true,
      accountName: "MANUAL VERIFICATION REQUIRED",
      accountNumber: accountNumber,
      bankCode: bankCode,
    };
  }

  async initiateTransfer(params: {
    amountNGN: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    reference: string;
    narration?: string;
  }): Promise<TransferResult> {
    console.log(`[Manual] Transfer request logged: ${params.amountNGN} NGN to ${params.accountNumber}`);
    return {
      success: true,
      reference: params.reference,
      providerReference: `MANUAL_${Date.now()}`,
      status: "pending",
      message: "Transfer logged for manual processing",
    };
  }

  async getTransferStatus(reference: string): Promise<TransferStatusResult> {
    console.log(`[Manual] Status check: ${reference}`);
    return {
      success: true,
      status: "pending",
      reference: reference,
      message: "Manual transfer - check admin dashboard",
    };
  }
}

const providers: Record<PayoutProviderName, PayoutProvider> = {
  paystack: new PaystackPayoutProvider(),
  flutterwave: new FlutterwavePayoutProvider(),
  manual: new ManualPayoutProvider(),
};

export function getPayoutProvider(providerName: PayoutProviderName): PayoutProvider {
  return providers[providerName] || providers.manual;
}

export function getPayoutProviderForCountry(countryCode: string): PayoutProvider {
  // Nigeria uses Paystack by default, fallback to Flutterwave
  if (countryCode === "NG") {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (paystackKey) {
      console.log(`[Payout] Country ${countryCode}: Using Paystack`);
      return providers.paystack;
    }
    
    const flwKey = process.env.FLW_SECRET_KEY;
    if (flwKey) {
      console.log(`[Payout] Country ${countryCode}: Using Flutterwave (fallback)`);
      return providers.flutterwave;
    }
    
    console.log(`[Payout] Country ${countryCode}: Using Manual (no provider configured)`);
    return providers.manual;
  }

  // Other countries use manual mode
  console.log(`[Payout] Country ${countryCode}: Using Manual`);
  return providers.manual;
}

export function generatePayoutReference(): string {
  return `ZIBANA_PAYOUT_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

// Webhook signature validation
export function validatePaystackWebhook(payload: string, signature: string): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  if (!secretKey) return false;
  
  const hash = crypto.createHmac("sha512", secretKey).update(payload).digest("hex");
  return hash === signature;
}

export function validateFlutterwaveWebhook(secretHash: string): boolean {
  const configuredHash = process.env.FLW_SECRET_HASH || "";
  if (!configuredHash) return false;
  
  return secretHash === configuredHash;
}

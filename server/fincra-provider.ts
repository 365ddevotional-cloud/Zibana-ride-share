import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentRequest, PaymentResult } from './payment-provider';

export function fincraCheckoutHost(): string {
  if (process.env.FINCRA_MODE === 'live') return 'checkout.fincra.com';
  const host = process.env.FINCRA_SANDBOX_CHECKOUT_HOST || '';
  return /^[a-z0-9-]+\.fincra\.com$/.test(host) ? host : '';
}

export function fincraReady(): boolean {
  const mode = process.env.FINCRA_MODE;
  return process.env.FINCRA_ENABLED === 'true' && !!process.env.FINCRA_SECRET_KEY &&
    !!fincraCheckoutHost() && !!process.env.FINCRA_PUBLIC_KEY && !!process.env.FINCRA_BUSINESS_ID && !!process.env.FINCRA_WEBHOOK_SECRET &&
    (mode === 'live' ? process.env.FINCRA_LIVE_VERIFIED === 'true' : mode === 'sandbox' && process.env.NODE_ENV !== 'production');
}
const referenceValid = (ref: unknown): ref is string => typeof ref === 'string' && /^ZIBANA_FCR_[A-Za-z0-9_-]{1,130}$/.test(ref);
function validAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 100 &&
    Number.isSafeInteger(Math.round(value * 100)) && value <= 99999999.99 && Math.abs(value * 100 - Math.round(value * 100)) < .000001;
}
function host() { return process.env.FINCRA_MODE === 'live' ? 'https://api.fincra.com' : 'https://sandboxapi.fincra.com'; }
const unavailable = (): PaymentResult => ({ success: false, error: 'Fincra payment confirmation is unavailable or requires review' });

export class FincraAdapter {
  name = 'fincra' as const;
  enabled = true;
  async initializePayment(request: PaymentRequest): Promise<PaymentResult> {
    if (!fincraReady() || !validAmount(request.amount) || request.currency !== 'NGN' ||
        !request.userId || !request.email || !request.customerName?.trim() || request.purpose !== 'wallet_funding' ||
        !referenceValid(request.transactionRef)) return unavailable();
    try {
      const callback = new URL(request.callbackUrl || '');
      if (callback.protocol !== 'https:') return unavailable();
      const response = await fetch(`${host()}/checkout/payments`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { 'api-key': process.env.FINCRA_SECRET_KEY!, 'x-pub-key': process.env.FINCRA_PUBLIC_KEY!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: request.amount, currency: 'NGN', reference: request.transactionRef,
          customer: { name: request.customerName.trim(), email: request.email }, feeBearer: 'business',
          paymentMethods: ['bank_transfer', 'card'], redirectUrl: callback.toString(),
          metadata: { userId: request.userId, purpose: 'wallet_funding' } }),
      });
      const body = await response.json();
      if (!response.ok || body.status !== true || body.data?.reference !== request.transactionRef) return unavailable();
      const checkout = new URL(body.data.link);
      const allowedHost = fincraCheckoutHost();
      if (checkout.protocol !== 'https:' || checkout.hostname !== allowedHost || checkout.username || checkout.password || checkout.port) return unavailable();
      return { success: true, status: 'initialized', transactionRef: request.transactionRef, authorizationUrl: checkout.toString() };
    } catch { return unavailable(); }
  }
  async verifyPayment(reference: string): Promise<PaymentResult> {
    if (!fincraReady() || !referenceValid(reference)) return unavailable();
    try {
      const response = await fetch(`${host()}/checkout/payments/merchant-reference/${encodeURIComponent(reference)}`, {
        redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { 'api-key': process.env.FINCRA_SECRET_KEY!, 'x-business-id': process.env.FINCRA_BUSINESS_ID! },
      });
      const body = await response.json();
      const p = body.data;
      if (!response.ok || body.status !== true || p?.status !== 'success' || p.businessId !== process.env.FINCRA_BUSINESS_ID ||
          p.merchantReference !== reference || p.currency !== 'NGN' || p.convertedCurrency !== 'NGN' ||
          p.feeBearer !== 'business' || !validAmount(p.amount) || !validAmount(p.amountReceived) ||
          p.amountReceived !== p.amount || p.amountExpected !== p.amount || p.varianceType != null || p.actionRequired != null ||
          typeof p.metadata?.userId !== 'string' || !p.metadata.userId || p.metadata.purpose !== 'wallet_funding' ||
          typeof p.customer?.email !== 'string' || !p.customer.email) return unavailable();
      return { success: true, status: 'verified', transactionRef: reference, amount: p.amountReceived,
        currency: 'NGN', userId: p.metadata.userId, purpose: 'wallet_funding', email: p.customer.email };
    } catch { return unavailable(); }
  }
  async initiateWithdrawal(): Promise<PaymentResult> { return { success: false, error: 'Fincra payouts are not enabled' }; }
}

export function validateFincraWebhook(body: unknown, signature: unknown): boolean {
  const secret = process.env.FINCRA_WEBHOOK_SECRET;
  if (!fincraReady() || !secret || !Buffer.isBuffer(body) || typeof signature !== 'string' || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac('sha512', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

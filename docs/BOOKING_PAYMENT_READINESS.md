# ZIBANA booking and payment readiness

The app is a preview. These changes secure incomplete payment paths; they do not enable a completed commercial booking or payment integration.

## Verified defects corrected

- Checkout initialization no longer creates automatic wallet credit.
- Production cannot report a simulated payment as a real payment.
- Wallet funding cannot collect money before a funding settlement ledger exists.
- Card authorization cannot charge NGN 50 and then claim to save a card without persisting verified provider authorization.
- Client-supplied card authorization values cannot create production payment methods.
- Production booking endpoints cannot accept unverified client-supplied fares or test-wallet payments.
- Paystack verification checks reference, live mode, currency, positive integer minor-unit amount and account metadata. Verification results carry the actual amount and owner for future settlement validation.
- Paystack signatures are checked against original request bytes with constant-time comparison.
- Payment-provider readiness requires configured credentials rather than a database flag alone.

## Work required before enabling commerce

1. Configure a provider test account securely, then complete sandbox checkout, failed-payment and webhook tests. Railway currently has no PAYSTACK_SECRET_KEY configured. Never put secret values in this repository or chat.
2. Implement a persistent funding intent containing account, wallet, reference, expected amount and currency before checkout. Callback and webhook processing must atomically credit exactly once, including duplicate and concurrent notifications, and reconcile refunds and chargebacks.
3. Persist reusable card authorizations from verified provider responses, encrypted on the server. Validate account ownership, intended authorization purpose and expected amount; expose masked fields only. Implement authorized saved-card charging before restoring auto top-up.
4. Configure a suitable routing/geocoding provider. Issue expiring server-side fare quotes from verified route distance and country/class pricing. Booking must consume an authenticated quote instead of a rider-supplied fare.
5. Complete country-scoped eligible-driver matching, atomic acceptance, wallet reservations, cancellation/release and final settlement. Test rider and driver flows together before enabling production booking.
6. Confirm the merchant account and processing fees before live financial transactions. Configure webhook delivery and monitoring. Automatic withdrawals remain outside this adapter; use the recorded admin withdrawal workflow.

No live customer payment, new paid service, database migration or domain transfer was performed during these checks.

## Validation

`npm run test:payments`: 17 checks covering real adapter and registered route behavior with mocked provider responses; no real charges.

Existing security, migration and currency suites: 20 tests passed. TypeScript check and production build passed. These checks do not establish live payment-provider or full commercial booking readiness.

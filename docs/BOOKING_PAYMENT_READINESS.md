# ZIBANA booking and payment readiness

The app is a preview. These changes secure incomplete payment paths; they do not enable a completed commercial booking or payment integration.

## Verified defects corrected

- Checkout initialization no longer creates automatic wallet credit.
- Production cannot report a simulated payment as a real payment.
- Wallet funding cannot collect money before a funding settlement ledger exists.
- Card authorization cannot charge NGN 50 and then claim to save a card without persisting verified provider authorization.
- Client-supplied card authorization values cannot create production payment methods.
- Production booking endpoints cannot accept unverified client-supplied fares or test-wallet payments.
- Paystack verification checks reference, live mode, currency, positive integer minor-unit amount and account metadata. Verification results carry the actual amount, owner, email and payment purpose for settlement validation.
- Paystack signatures are checked against original request bytes with constant-time comparison.
- Payment-provider readiness requires configured credentials rather than a database flag alone.

## Work required before enabling commerce

1. Configure a provider test account securely, then complete sandbox checkout, failed-payment and webhook tests. Railway currently has no PAYSTACK_SECRET_KEY configured. Never put secret values in this repository or chat.
2. Configure webhook delivery and verify the implemented funding ledger against provider sandbox responses before enabling WALLET_FUNDING_ENABLED. Persistent intents bind account, wallet, reference, expected amount, email, purpose and NGN currency before checkout. Callback and webhook settlement use database locks and an atomic balance/receipt/intent transaction to prevent duplicate credit. Refund and chargeback reconciliation remains to be implemented.
3. Persist reusable card authorizations from verified provider responses, encrypted on the server. Validate account ownership, intended authorization purpose and expected amount; expose masked fields only. Implement authorized saved-card charging before restoring auto top-up.
4. Configure a suitable routing/geocoding provider. Issue expiring server-side fare quotes from verified route distance and country/class pricing. Booking must consume an authenticated quote instead of a rider-supplied fare.
5. Complete country-scoped eligible-driver matching, atomic acceptance, wallet reservations, cancellation/release and final settlement. Test rider and driver flows together before enabling production booking.
6. Confirm the merchant account and processing fees before live financial transactions. Configure webhook delivery and monitoring. Automatic withdrawals remain outside this adapter; use the recorded admin withdrawal workflow.

No live customer payment, new paid service or domain transfer was performed during these checks. The funding-intent table is created lazily on first ledger use. Checkout is disabled by default and requires WALLET_FUNDING_ENABLED=true, configured real provider credentials and an eligible Nigerian NGN wallet. Other-country funding, saved cards, auto top-up and production booking remain unavailable.

## Validation

`npm run test:payments`: 17 checks covering real adapter and registered route behavior with mocked provider responses; no real charges.

`npm run test:settlement`: 15 checks execute the ledger on PostgreSQL via PGlite and exercise registered routes: account/amount/currency validation, duplicate delivery, rollback and retry, unknown references and private receipts. The local test pool serializes connections; these tests are not a multi-connection production stress test.

Existing security, migration and currency suites: 20 tests passed (52 total). TypeScript check and production build passed. These checks do not establish live payment-provider or full commercial booking readiness.


## 9 October 2026: commercial activation review

The selected candidate provider is Fincra for Zibana Mobility Services. Existing Paystack code is not a Fincra integration. Production currently has neither Fincra nor Mapbox credentials. No live charges can be enabled from the fare estimator alone. Required next inputs: approved Fincra merchant account and securely configured sandbox credentials, Mapbox account/token and cost limit, and confirmed launch city/permitted Keke routes. Outstanding engineering includes request usage/cost accounting, server-issued quotes, Fincra collection/webhook verification, refunds and ride settlement.

Map repairs in this release: clear rider location/path when the assigned trip changes or ends; filter other-driver socket updates and invalid coordinates; expire the Live badge even when all updates stop; cancel stale history results on trip changes; avoid asynchronous Leaflet initialization after unmount; report tile loading errors; remove the invented-distance ETA; validate driver navigation coordinates and remove the unconditional second navigation launch. Existing rider tiles use OpenStreetMap, not Mapbox: they must not be billed as Mapbox requests. Physical-device GPS, installed navigation app handoff, and authenticated two-device trip tests remain unverified.

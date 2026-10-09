# Fincra and Mapbox activation — 9 October 2026

This release adds Fincra **wallet funding** integration and an admin-only Mapbox Directions preview with persistent usage accounting. It does not complete commercial ride booking, driver settlement, Fincra payouts, refunds/chargebacks or rider fare-quote allocation. Do not turn on collections simply because deployment succeeds. The selected Nigerian business is Zibana Mobility Services.

## Fincra

Use a separate non-production database/environment for sandbox testing. Never place secrets in source control, chat, browser bundles or logs.

Configure server variables securely:
- `NG_PAYMENT_PROVIDER=fincra`
- `FINCRA_ENABLED=true`
- `FINCRA_MODE=sandbox` during non-production validation
- `FINCRA_SECRET_KEY`, `FINCRA_PUBLIC_KEY`, `FINCRA_BUSINESS_ID`, `FINCRA_WEBHOOK_SECRET`
- `FINCRA_SANDBOX_CHECKOUT_HOST`: exact sandbox checkout hostname returned by the merchant's sandbox setup; must be one subdomain of fincra.com. No guessed default hostname is used.
- `APP_BASE_URL`: trusted HTTPS application origin
- `WALLET_FUNDING_ENABLED=true` only for the isolated validation environment

The Nigerian country's existing paymentsEnabled setting must also permit payment initialization. Provider initialization requires the authenticated account's stored name and email, an unfrozen NGN wallet and a persistent funding intent. Fincra intents have the immutable ZIBANA_FCR_ prefix; existing Paystack references keep using Paystack verification even after provider selection changes. Metadata binds the account and wallet-funding purpose. Provider processing fees are borne by the business; they are not an undisclosed checkout surcharge.

Webhook: `/api/webhooks/fincra`. Configure the webhook URL and signing secret with Fincra. Original bytes are authenticated using HMAC-SHA512, followed by an independent API lookup before ledger settlement. Validate the signing serialization and checkout response fields with actual sandbox deliveries before activation. Documentation has differing checkout and charge event shapes; the handler accepts the checkout merchantReference field and deliberately rejects unknown shapes. No field should be relaxed just to make a test pass.

Callback: `/api/wallet/verify?reference=...`. A browser redirect never proves payment. Verification requires correct business, merchant reference, NGN currency, purpose, user and email, plus matching expected/received amount. Amount discrepancies, action-required responses and unknown fields that affect verification fail closed for manual reconciliation. Duplicate verified callbacks/webhooks share the existing atomic ledger, so credit/receipt/intent commit once together.

Production additionally requires `FINCRA_MODE=live` and `FINCRA_LIVE_VERIFIED=true`, live credentials and verified merchant approval. This flag is an operational assertion, not automated proof of provider readiness. Do not set it until sandbox validation, fees, refunds, support/reconciliation and allowed payment use are reviewed. Production refuses sandbox configuration. Fincra payouts are disabled.

Verify with the provider: collection fees, settlement timing, NGN driver payout fees, business approval, refund procedure, and whether wallet funding/ride aggregation is approved. No live provider transaction has been executed in this release.

Sources:
- https://docs.fincra.com/docs/checkout-redirect
- https://docs.fincra.com/docs/handling-underpayments-and-overpayments
- https://docs.fincra.com/docs/encryption

## Mapbox Directions

The existing rider map uses OpenStreetMap tiles and native navigation links. Neither is recorded as Mapbox usage. This release adds a separate admin route preview for controlled integration testing; it does not switch riders/drivers to Mapbox or bill users.

Server variables (all explicit, no paid default):
- `MAPBOX_DIRECTIONS_ENABLED=true`
- `MAPBOX_ACCESS_TOKEN`
- `MAPBOX_PERIOD_START`, `MAPBOX_PERIOD_END`: exact active billing interval, ISO timestamps with timezone
- `MAPBOX_PERIOD_STARTING_REQUESTS`: already-consumed account Directions requests when tracking begins
- `MAPBOX_MAX_REQUESTS`: maximum additional requests through this integration during the interval
- `MAPBOX_MAX_COST_MICROUSD`: maximum reserved estimated cost in millionths of USD; 0 refuses any paid request

Admin APIs require an authenticated admin/super-admin:
- GET `/api/admin/mapping/usage`: recent billing-period counters, failed attempts and estimated cost.
- POST `/api/admin/mapping/route-preview`: `{ "requestKey": "unique-attempt-id", "coordinates": [[longitude, latitude], [longitude, latitude]] }`.

The database reserves a request and its estimated cost before the network call, serializing each billing period. Retried request keys are rejected. Provider failures and timeouts retain their reservation until reconciliation because the provider may have received the request. Costs are integer microdollars using published Directions tiers, not confirmed invoices. No raw route coordinates or response geometries are stored in this usage ledger. Other products are not tracked by this ledger and must not be enabled without separate controls.

The cutoff controls only this application path. Account usage by other applications/tokens must be included in the starting balance and monitored; an isolated account is preferable for an enforceable app-level allowance. Changing the provider billing period or baseline requires reconciliation rather than resetting counters. Existing period definitions cannot be overwritten. This is not a provider-wide spending cap.

Free/paid classification feeds the approved future fare policy: $1/1,000 free requests; paid usage at cost plus 60%, converted using the quote's recorded exchange rate. **Allocation to rider quotes and charge settlement is not implemented by this admin preview.** Never charge for preview/test requests or invent a Mapbox cost for OpenStreetMap usage. Reconcile invoice differences without changing already accepted fares.

Before passenger use: validate local address/routing quality, approved Keke corridors/exclusions, authenticated server quotes, eligible driver matching, wallet reservation/release, cancellation and final settlement. A driving route is not Keke road permission. Physical-device rider/driver GPS, offline/reconnect, background tracking and navigation handoff remain required tests.

Source: https://www.mapbox.com/pricing and https://docs.mapbox.com/api/navigation/directions/

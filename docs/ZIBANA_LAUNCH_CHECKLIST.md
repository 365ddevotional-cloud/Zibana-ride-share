# ZIBANA eight-batch launch checklist

Owner request: keep these eight batches as the shared checklist, update progress each work session, and continue until verified complete. Last checked: 9 October 2026.

## Current release
Railway amiable-illumination / production / ZIBANA-Ride-Share-v4:
- Commit f2626276fdd7f3f6a0763ea54f498f0eca613752.
- Deployment b1e87603-a4db-4d49-ab5e-b8fee943586f: SUCCESS, 2026-10-09T12:42:04Z.
- Includes gated Fincra wallet integration and budgeted admin Mapbox route previews.
- 55 targeted local tests, TypeScript and production build passed before deployment.
- Deployment is not permission or proof to enable live charging. Provider verification and complete ride settlement remain unfinished.

## Checklist
1. [x] Apply prepared deployment and check app health — deployed successfully; verify /health when resuming.
2. [ ] Connect provider accounts — Fincra approval for Zibana Mobility Services; confirm collection/payout fees; securely configure credentials and webhook; connect Mapbox with an owner-approved budget.
3. [ ] Verify payments — actual sandbox successful/failed/cancelled/underpaid/duplicate events, wallet receipts and reconciliation; finish refunds and chargebacks. Mock tests passed; live provider testing outstanding.
4. [ ] Finish fare billing — server-issued quotes linked to measured usage, recorded exchange rate, full upfront price; $1 per 1,000 free Mapbox requests and 60% markup on paid Mapbox costs. Fare model complete; quote allocation outstanding.
5. [ ] Complete ride transactions — country/class eligible matching, atomic acceptance, wallet reservation/release, cancellations, final driver/platform settlement and verified driver payouts.
6. [ ] Approve Keke operating areas — owner supplies launch city/cities; confirm local permits, allowed roads, vehicle capacity and enforce route exclusions.
7. [ ] Test rider and driver maps together — pickup/destination, road routes, GPS, tracking, offline/reconnect, background tracking, trip sharing and navigation handoff on separate devices. Map defects fixed; authenticated physical-device verification outstanding.
8. [ ] Controlled launch and tester release — end-to-end pilot with verified charges/settlement; enable bookings only after readiness; Android/Play test build, screenshots and tester instructions.

## Working rules
- Keep the same eight batches; do not silently rename, restart or mark unfinished batches complete.
- Report completed work, evidence, blockers and the next action each work session.
- Preserve existing users, balances and records.
- Tell the owner before additional spending; no surprise subscriptions or paid provider activation.
- Fincra business name: Zibana Mobility Services, exactly as on CAC and Zenith account; no Ltd suffix.
- Existing rider map uses OpenStreetMap and native navigation. Do not bill these as Mapbox requests.
- Gross mapping revenue is not guaranteed net profit after processor fees and other costs.
- Do not request or store secret keys in chat.
- See FINCRA_MAPBOX_ACTIVATION.md and BOOKING_PAYMENT_READINESS.md for technical activation details.

## Next owner input
Confirm whether Fincra registration is complete. If not, obtain the business email to use. Also obtain Mapbox account setup/access, maximum monthly services budget, and launch city/permitted Keke scope.

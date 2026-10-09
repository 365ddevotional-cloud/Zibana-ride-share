# ZIBANA Nigeria: approved Keke and car tariff

Research date: 9 October 2026. Owner approved on 9 October 2026 in the instruction to open Keke bookings and make pricing final. Tariff version: NG-2026-10-09-v2.

The tariff is now owner-approved. Commercial activation is still blocked by missing permitted-route scope, verified routing, complete booking settlement and payment credentials. Owner approval does not establish regulatory permission, provider readiness or profitability.

## Market evidence

NNPC retail prices reported on 8 October: Lagos/Rivers ₦1,355/L, Abuja ₦1,370/L, Enugu ₦1,372/L and Yobe ₦1,435/L. These are reported station prices, not a guaranteed national tariff. Source: https://www.legit.ng/business-economy/energy/1734964-nnpc-reduces-petrol-price-by-n5-announces-rates/

The Presidency announced planned temporary retail relief and negotiations for an ex-gantry/landing ceiling. A wholesale ceiling is not a nationwide pump price: https://statehouse.gov.ng/nnpc-retail-forgoes-petrol-profit-margin-to-offer-some-support-to-nigerian-households-amid-global-petrol-crisis-fg-announces-additional-measures/

Bolt says estimates depend on distance and vehicle class, so there is no verified single current Nigerian fare to copy: https://bolt.eu/en/rides/

March 2026 Enugu reports describe selected public transport routes at ₦500–₦600 after increases. These older shared-route prices are not current private-hire Keke quotes: https://www.premiumtimesng.com/regional/ssouth-east/863082-fuel-price-transport-fares-rise-by-10-in-enugu.html

Collect same-route Bolt/Uber/inDrive quotes morning, afternoon and evening in the launch city, and interview Keke operators before activation. Record distance, time, fuel receipts, daily lease payments, local levies, maintenance, insurance and actual utilization.

## Approved tariff (NGN)

| Component | Private Keke | Standard car |
|---|---:|---:|
| Base fare | 200 | 700 |
| Per kilometre | 130 | 300 |
| Per minute | 15 | 35 |
| Minimum transport fare | 700 | 1,800 |
| Visible booking fee, added separately | 100 | 200 |
| Commission on transport fare | 10% | 15% |

These are whole-vehicle private fares, not prices per passenger. Passenger capacity must be verified against vehicle approval; three is a category ceiling, not permission to overload. Tips and approved toll reimbursements should pass entirely to the driver outside commission. Do not silently charge a fuel surcharge or surge. Show the final quote before confirmation.

The model rounds transport fares up to ₦50 and applies the higher of the tariff, driver cost/income floor, and platform contribution floor. It is isolated from live fare calculation. Never change an accepted quote when fuel changes.

## Explicit assumptions requiring field validation

Petrol ₦1,400/L; stress tests up to ₦2,400/L. Keke 25 km/L and car 12 km/L are modelling assumptions, not measured guarantees. Maintenance/depreciation allowances ₦25/km and ₦70/km respectively. Add 2 km pickup/reposition and 10 unpaid minutes. Local levy allocations ₦60/Keke and ₦80/car. Target driver net income after these costs: ₦600/hour Keke and ₦1,800/hour car.

Payment processing assumed 2% of rider total, plus ₦100 allocated trip costs: payout ₦30, support ₦30, risk reserve ₦20 and tax reserve ₦20. These are placeholders, not a provider quote or a statutory tax rate. Replace with signed provider fees, actual taxes, refunds, chargebacks, insurance and lease costs. Settlement taxes and commissions require accountant review. Unmeasured costs can erase the estimated margins.

## Examples including booking fee

| Trip | Rider total | Driver gross | Estimated driver net after modelled costs | ZIBANA contribution after modelled variable costs |
|---|---:|---:|---:|---:|
| Keke 2 km / 10 min | 800 | 630 | 246 | 54 |
| Keke 5 km / 20 min | 1,250 | 1,035 | 408 | 90 |
| Keke 10 km / 30 min | 2,050 | 1,755 | 723 | 154 |
| Car 2 km / 10 min | 2,000 | 1,530 | 703 | 330 |
| Car 5 km / 20 min | 3,100 | 2,465 | 1,078 | 473 |
| Car 10 km / 30 min | 4,950 | 4,037.50 | 1,717.50 | 713.50 |

Contribution is not net profit. Monthly break-even rides = actual monthly fixed overhead divided by weighted average contribution. At ₦90 contribution, ₦90,000 of monthly overhead needs 1,000 completed paid trips, before additional unmodelled losses. No zero-loss guarantee is possible.

## Launch conditions

Keke drivers can declare their vehicle category; changed vehicles return to review and go offline. Car and tricycle eligibility are separate. Keke booking remains closed in every environment. Obtain current state/LGA permits and permitted-road confirmation, inspect capacity and insurance, implement exclusion routing for prohibited roads, verify onboarding and payment settlement, then activate the approved tariff only in cleared operating areas. Lagos restrictions mean a nationwide Keke launch is inappropriate; an old announcement is background evidence only: https://fmino.gov.ng/lagos-bans-commercial-motorcycles-tricycles-on-major-highways/

Review fuel weekly; re-evaluate when verified local fuel changes more than 5%. Do not subsidize promotions from driver earnings. Require positive contribution after actual costs; monitor driver net per online hour, deadhead distance, completed trips, cancellations and refunds. Test shared-seat pooling separately before introducing it.

## Current activation blockers checked on 9 October 2026

- Launch city and permitted-road scope are not specified in this session.
- Railway has no PAYSTACK_SECRET_KEY configured. Live provider checkout and settlement have not been verified.
- Production booking currently blocks both ride-request paths; opening them requires server-issued route quotes, eligible-driver matching, atomic reservation/acceptance and final settlement.
- Paid-service permission was given in principle, but no monthly spending ceiling or individual purchase amount was supplied. No purchase, subscription or live charge has been made.
- Paystack's published local collection fee is 1.5% plus NGN 100, with NGN 100 waived below NGN 2,500 and fees capped at NGN 2,000. Transfer fees and any applicable levies are separate. The 2% modelling assumption above is not an actual provider fee; replace the full cost model before charging riders. Source: https://support.paystack.com/en/articles/2130306


## Approved Mapbox cost recovery — 9 October 2026

Owner instruction: recover every $1 of Mapbox cost with $0.60 profit. Implemented as a 60% cost markup (37.5% gross margin on the recovery revenue), not a 60% revenue margin.

`mapboxRecoveryFee = ceilToKobo(allocatedMapboxCostNgn × 1.60)`

The fare estimator adds the recovery fee to the rider total and platform revenue, leaves the transport fare and driver earnings unchanged, and subtracts the underlying Mapbox expense when calculating platform contribution. Free-tier cost defaults to zero. The $0.60 is gross profit before payment fees, taxes and other overhead; it is not a guaranteed net profit. Minor-unit rounding can increase the effective markup for very small costs.

Activation requirements: implement a server-owned usage/cost ledger, allocate paid usage (including unbooked quotes and reroutes) consistently across future quotes, record the USD/NGN rate and allocation basis in each quote, show the recovery amount before confirmation, and reconcile provider invoices. Do not infer spend merely from ride count; Mapbox products and free allowances are separate. No retrospective charge to accepted quotes. Never read provider costs or FX rates from rider request bodies. Exclude Mapbox from fixedTripCosts to avoid double counting.

This policy is implemented in the offline fare estimator only. Production quotes, collections and Mapbox integration remain inactive pending the documented booking/payment work. No paid provider was enabled by this change.

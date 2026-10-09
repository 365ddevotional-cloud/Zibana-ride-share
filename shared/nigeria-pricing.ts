/** Owner-approved Nigeria tariff, 9 October 2026. All values NGN.
 * Commercial activation still requires approved routes, signed server quotes and verified settlement.
 * The operating-cost inputs remain estimates; approval is not proof of profitability.
 */
export const NIGERIA_PRICING_VERSION = "NG-2026-10-09-v3";
export const NIGERIA_PRICING_APPROVAL = "owner_approved" as const;
export const MAPBOX_COST_MARKUP = 0.60;
export const MAPBOX_FREE_REQUEST_FEE_USD = 1 / 1000;

export const policies = {
  keke: { base: 200, km: 130, minute: 15, minimum: 700, bookingFee: 100, commission: .10, kmPerLitre: 25, maintenancePerKm: 25, levy: 60, incomePerHour: 600, targetContribution: 50 },
  car: { base: 700, km: 300, minute: 35, minimum: 1800, bookingFee: 200, commission: .15, kmPerLitre: 12, maintenancePerKm: 70, levy: 80, incomePerHour: 1800, targetContribution: 100 },
} as const;

export function estimateNigeriaFare(category: keyof typeof policies, distanceKm: number, minutes: number,
  options: { petrolPerLitre?: number; pickupKm?: number; unpaidMinutes?: number; paymentRate?: number; fixedTripCosts?: number; mapboxCostNgn?: number; mapboxFreeRequests?: number; mappingUsdToNgn?: number } = {}) {
  const p = policies[category];
  if (!p) throw new Error("Unsupported vehicle category");
  const { petrolPerLitre = 1400, pickupKm = 2, unpaidMinutes = 10, paymentRate = .02, fixedTripCosts = 100, mapboxCostNgn = 0, mapboxFreeRequests = 0, mappingUsdToNgn } = options;
  for (const v of [distanceKm, minutes, petrolPerLitre, pickupKm, unpaidMinutes, paymentRate, fixedTripCosts, mapboxCostNgn]) {
    if (!Number.isFinite(v) || v < 0) throw new Error("Inputs must be finite and nonnegative");
  }
  if (!Number.isSafeInteger(mapboxFreeRequests) || mapboxFreeRequests < 0) throw new Error("Free mapping requests must be a nonnegative integer");
  if (mappingUsdToNgn !== undefined && (!Number.isFinite(mappingUsdToNgn) || mappingUsdToNgn <= 0)) throw new Error("Mapping FX rate must be finite and positive");
  if (mapboxFreeRequests > 0 && mappingUsdToNgn === undefined) throw new Error("Free mapping fees require a recorded USD/NGN rate");
  if (minutes + unpaidMinutes <= 0 || p.commission <= paymentRate) throw new Error("Pricing policy needs review");
  const operatingCost = (distanceKm + pickupKm) * (petrolPerLitre / p.kmPerLitre + p.maintenancePerKm) + p.levy;
  const driverFloor = (operatingCost + p.incomePerHour * (minutes + unpaidMinutes) / 60) / (1 - p.commission);
  const platformFloor = (fixedTripCosts + p.targetContribution - p.bookingFee + paymentRate * p.bookingFee) / (p.commission - paymentRate);
  const transportFare = Math.ceil(Math.max(p.minimum, p.base + distanceKm * p.km + minutes * p.minute, driverFloor, platformFloor) / 50) * 50;
  // Trusted, allocated provider cost in NGN, converted with the quote's recorded FX rate.
  // Never accept this input from the rider. Free-tier usage has zero provider cost.
  // fixedTripCosts must exclude Mapbox to avoid charging for it twice.
  // Charge free requests at $1/1,000, not as a fictitious provider expense.
  // Ledger must classify each request as free OR paid, never both.
  const mapboxFreeUsageFeeNgn = mapboxFreeRequests * MAPBOX_FREE_REQUEST_FEE_USD * (mappingUsdToNgn ?? 0);
  const mappingUnroundedFee = mapboxCostNgn * (1 + MAPBOX_COST_MARKUP) + mapboxFreeUsageFeeNgn;
  if (!Number.isFinite(mappingUnroundedFee) || mappingUnroundedFee * 100 > Number.MAX_SAFE_INTEGER) throw new Error("Mapping fee exceeds supported precision");
  const mapboxRecoveryFee = Math.ceil(mappingUnroundedFee * 100) / 100;
  const riderTotal = Math.round((transportFare + p.bookingFee + mapboxRecoveryFee) * 100) / 100;
  const driverGross = Math.round(transportFare * (1 - p.commission) * 100) / 100;
  const platformRevenue = Math.round((transportFare - driverGross + p.bookingFee + mapboxRecoveryFee) * 100) / 100;
  return { currency: "NGN" as const, status: NIGERIA_PRICING_APPROVAL, pricingVersion: NIGERIA_PRICING_VERSION, transportFare, bookingFee: p.bookingFee, riderTotal, driverGross,
    mapboxCostNgn, mapboxRecoveryFee, mapboxFreeRequests, mappingUsdToNgn, mapboxFreeUsageFeeNgn,
    mapboxGrossProfit: Math.round((mapboxRecoveryFee - mapboxCostNgn) * 100) / 100,
    operatingCost, estimatedDriverNet: driverGross - operatingCost,
    estimatedDriverHourly: (driverGross - operatingCost) * 60 / (minutes + unpaidMinutes),
    platformRevenue, platformContribution: platformRevenue - riderTotal * paymentRate - fixedTripCosts - mapboxCostNgn };
}

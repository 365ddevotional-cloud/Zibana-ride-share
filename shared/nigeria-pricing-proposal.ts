/** Offline proposal only. Not connected to booking, charging or settlement. All values NGN. */
export const policies = {
  keke: { base: 200, km: 130, minute: 15, minimum: 700, bookingFee: 100, commission: .10, kmPerLitre: 25, maintenancePerKm: 25, levy: 60, incomePerHour: 600, targetContribution: 50 },
  car: { base: 700, km: 300, minute: 35, minimum: 1800, bookingFee: 200, commission: .15, kmPerLitre: 12, maintenancePerKm: 70, levy: 80, incomePerHour: 1800, targetContribution: 100 },
} as const;

export function estimateNigeriaProposal(category: keyof typeof policies, distanceKm: number, minutes: number,
  options: { petrolPerLitre?: number; pickupKm?: number; unpaidMinutes?: number; paymentRate?: number; fixedTripCosts?: number } = {}) {
  const p = policies[category];
  if (!p) throw new Error("Unsupported vehicle category");
  const { petrolPerLitre = 1400, pickupKm = 2, unpaidMinutes = 10, paymentRate = .02, fixedTripCosts = 100 } = options;
  for (const v of [distanceKm, minutes, petrolPerLitre, pickupKm, unpaidMinutes, paymentRate, fixedTripCosts]) {
    if (!Number.isFinite(v) || v < 0) throw new Error("Inputs must be finite and nonnegative");
  }
  if (minutes + unpaidMinutes <= 0 || p.commission <= paymentRate) throw new Error("Pricing policy needs review");
  const operatingCost = (distanceKm + pickupKm) * (petrolPerLitre / p.kmPerLitre + p.maintenancePerKm) + p.levy;
  const driverFloor = (operatingCost + p.incomePerHour * (minutes + unpaidMinutes) / 60) / (1 - p.commission);
  const platformFloor = (fixedTripCosts + p.targetContribution - p.bookingFee + paymentRate * p.bookingFee) / (p.commission - paymentRate);
  const transportFare = Math.ceil(Math.max(p.minimum, p.base + distanceKm * p.km + minutes * p.minute, driverFloor, platformFloor) / 50) * 50;
  const riderTotal = transportFare + p.bookingFee;
  const driverGross = Math.round(transportFare * (1 - p.commission) * 100) / 100;
  const platformRevenue = transportFare - driverGross + p.bookingFee;
  return { currency: "NGN" as const, status: "proposal" as const, transportFare, bookingFee: p.bookingFee, riderTotal, driverGross,
    operatingCost, estimatedDriverNet: driverGross - operatingCost,
    estimatedDriverHourly: (driverGross - operatingCost) * 60 / (minutes + unpaidMinutes),
    platformRevenue, platformContribution: platformRevenue - riderTotal * paymentRate - fixedTripCosts };
}

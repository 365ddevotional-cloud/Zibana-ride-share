// ZIBANA Pricing & Commission Configuration
const BASE_FARE = 5.00;
const PER_PASSENGER_FEE = 1.00;
const DEFAULT_COMMISSION_PERCENTAGE = 20.00;

export interface PricingDetails {
  fareAmount: string;
  driverPayout: string;
  commissionAmount: string;
  commissionPercentage: string;
}

export function calculateFare(passengerCount: number): PricingDetails {
  const fareAmount = BASE_FARE + (passengerCount * PER_PASSENGER_FEE);
  const commissionPercentage = DEFAULT_COMMISSION_PERCENTAGE;
  const commissionAmount = (fareAmount * commissionPercentage) / 100;
  const driverPayout = fareAmount - commissionAmount;

  return {
    fareAmount: fareAmount.toFixed(2),
    driverPayout: driverPayout.toFixed(2),
    commissionAmount: commissionAmount.toFixed(2),
    commissionPercentage: commissionPercentage.toFixed(2),
  };
}

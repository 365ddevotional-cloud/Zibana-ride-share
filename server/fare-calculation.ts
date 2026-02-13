/**
 * Phase 22 Step D - ZIBANA Comprehensive Fare Calculation
 * 
 * Handles dynamic pricing with:
 * - Base fare + distance + time fees
 * - Waiting time compensation (grace, paid, premium tiers)
 * - Traffic/time overrun adjustments
 * - Driver cancellation compensation
 * - Mid-trip early stop recalculation
 */

import {
  WAITING_FREE_MINUTES,
  WAITING_PAID_MINUTES,
  WAITING_BONUS_MINUTES,
  calculateWaitingTime,
  isDriverEligibleForCompensation
} from "./ride-lifecycle";

// ========================
// PRICING CONSTANTS
// ========================

// Base fare (flat fee for all rides)
export const BASE_FARE = 5.00;

// Distance pricing (per km)
export const DISTANCE_RATE_PER_KM = 1.50;

// Time pricing (per minute)
export const TIME_RATE_PER_MINUTE = 0.25;

// Waiting time rates
export const WAITING_PAID_RATE_PER_MINUTE = 0.30;      // Standard paid waiting
export const WAITING_BONUS_RATE_PER_MINUTE = 0.50;    // Premium waiting rate

// Traffic/overrun rate (extra per minute over estimate)
export const TRAFFIC_OVERRUN_RATE_PER_MINUTE = 0.35;

// Cancellation compensation rates
export const CANCELLATION_DISTANCE_RATE_PER_KM = 1.00;  // Per km driven before cancel
export const CANCELLATION_MINIMUM_FEE = 3.00;           // Minimum cancellation fee to rider
export const CANCELLATION_PLATFORM_FEE_PERCENT = 20;    // ZIBANA's cut of cancellation

// Commission
export const PLATFORM_COMMISSION_PERCENT = 20;

// ========================
// TYPES
// ========================

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  waitingFee: number;
  trafficFee: number;
  totalFare: number;
  driverEarning: number;
  platformFee: number;
  currencyCode: string;
}

export interface WaitingFeeBreakdown {
  freeMinutes: number;
  paidMinutes: number;
  bonusMinutes: number;
  totalMinutes: number;
  paidWaitingFee: number;
  bonusWaitingFee: number;
  totalWaitingFee: number;
}

export interface TrafficAdjustment {
  estimatedMinutes: number;
  actualMinutes: number;
  extraMinutes: number;
  trafficFee: number;
}

export interface CancellationCompensation {
  eligible: boolean;
  reason: string;
  driverCompensation: number;
  platformFee: number;
  riderCharge: number;
}

export interface EarlyStopRecalculation {
  originalEstimatedKm: number;
  actualDistanceKm: number;
  originalEstimatedMin: number;
  actualDurationMin: number;
  originalFare: number;
  recalculatedFare: number;
  difference: number;
}

export type DriverCancelReason = 
  | "rider_requested"       // Rider asked driver to cancel
  | "safety_concern"        // Driver felt unsafe
  | "vehicle_issue"         // Car broke down
  | "emergency"             // Personal emergency
  | "rider_no_show"         // Rider didn't appear after waiting
  | "other";                // Other reason (may flag for review)

export const JUSTIFIED_CANCEL_REASONS: DriverCancelReason[] = [
  "rider_requested",
  "safety_concern",
  "vehicle_issue",
  "emergency",
  "rider_no_show"
];

// ========================
// FARE CALCULATION FUNCTIONS
// ========================

/**
 * Calculate the complete fare breakdown for a completed ride
 */
export function calculateCompleteFare(params: {
  distanceKm: number;
  durationMin: number;
  estimatedDurationMin?: number;
  waitingStartedAt?: Date | null;
  tripEndedAt?: Date;
  currencyCode: string;
  fareMultiplier?: number;
}): FareBreakdown {
  const {
    distanceKm,
    durationMin,
    estimatedDurationMin = durationMin,
    waitingStartedAt = null,
    tripEndedAt = new Date(),
    currencyCode,
    fareMultiplier = 1.0
  } = params;

  const multiplier = Math.max(1.0, fareMultiplier);

  const baseFare = BASE_FARE * multiplier;
  const distanceFare = distanceKm * DISTANCE_RATE_PER_KM * multiplier;
  const timeFare = durationMin * TIME_RATE_PER_MINUTE * multiplier;

  const waitingBreakdown = calculateWaitingFee(waitingStartedAt, tripEndedAt);
  const waitingFee = waitingBreakdown.totalWaitingFee;

  const trafficAdjustment = calculateTrafficAdjustment(estimatedDurationMin, durationMin);
  const trafficFee = trafficAdjustment.trafficFee;

  const totalFare = baseFare + distanceFare + timeFare + waitingFee + trafficFee;

  const platformFee = (totalFare * PLATFORM_COMMISSION_PERCENT) / 100;
  const driverEarning = totalFare - platformFee;

  return {
    baseFare: round(baseFare),
    distanceFare: round(distanceFare),
    timeFare: round(timeFare),
    waitingFee: round(waitingFee),
    trafficFee: round(trafficFee),
    totalFare: round(totalFare),
    driverEarning: round(driverEarning),
    platformFee: round(platformFee),
    currencyCode
  };
}

/**
 * Calculate waiting fee breakdown
 */
export function calculateWaitingFee(
  waitingStartedAt: Date | null,
  endTime: Date = new Date()
): WaitingFeeBreakdown {
  if (!waitingStartedAt) {
    return {
      freeMinutes: 0,
      paidMinutes: 0,
      bonusMinutes: 0,
      totalMinutes: 0,
      paidWaitingFee: 0,
      bonusWaitingFee: 0,
      totalWaitingFee: 0
    };
  }

  const breakdown = calculateWaitingTime(waitingStartedAt, endTime);

  const paidWaitingFee = breakdown.paidMinutes * WAITING_PAID_RATE_PER_MINUTE;
  const bonusWaitingFee = breakdown.bonusMinutes * WAITING_BONUS_RATE_PER_MINUTE;
  const totalWaitingFee = paidWaitingFee + bonusWaitingFee;

  return {
    freeMinutes: round(breakdown.freeMinutes),
    paidMinutes: round(breakdown.paidMinutes),
    bonusMinutes: round(breakdown.bonusMinutes),
    totalMinutes: round(breakdown.totalMinutes),
    paidWaitingFee: round(paidWaitingFee),
    bonusWaitingFee: round(bonusWaitingFee),
    totalWaitingFee: round(totalWaitingFee)
  };
}

/**
 * Calculate traffic/time overrun adjustment
 */
export function calculateTrafficAdjustment(
  estimatedMinutes: number,
  actualMinutes: number
): TrafficAdjustment {
  const extraMinutes = Math.max(0, actualMinutes - estimatedMinutes);
  const trafficFee = extraMinutes * TRAFFIC_OVERRUN_RATE_PER_MINUTE;

  return {
    estimatedMinutes: round(estimatedMinutes),
    actualMinutes: round(actualMinutes),
    extraMinutes: round(extraMinutes),
    trafficFee: round(trafficFee)
  };
}

/**
 * Calculate driver compensation for rider cancellation
 */
export function calculateCancellationCompensation(params: {
  distanceKm: number;
  durationSec: number;
  waitingStartedAt?: Date | null;
  cancelledAt?: Date;
}): CancellationCompensation {
  const { distanceKm, durationSec, waitingStartedAt, cancelledAt = new Date() } = params;

  // Check if driver is eligible
  const eligibility = isDriverEligibleForCompensation(distanceKm, durationSec);

  if (!eligibility.eligible) {
    return {
      eligible: false,
      reason: eligibility.reason,
      driverCompensation: 0,
      platformFee: 0,
      riderCharge: CANCELLATION_MINIMUM_FEE // Rider still pays minimum fee
    };
  }

  // Calculate compensation based on distance driven
  let driverCompensation = distanceKm * CANCELLATION_DISTANCE_RATE_PER_KM;

  // Add any waiting fees if applicable
  if (waitingStartedAt) {
    const waitingBreakdown = calculateWaitingFee(waitingStartedAt, cancelledAt);
    driverCompensation += waitingBreakdown.totalWaitingFee;
  }

  // Ensure minimum compensation
  driverCompensation = Math.max(driverCompensation, CANCELLATION_MINIMUM_FEE);

  // Platform fee
  const platformFee = (driverCompensation * CANCELLATION_PLATFORM_FEE_PERCENT) / 100;
  const riderCharge = driverCompensation + platformFee;

  return {
    eligible: true,
    reason: eligibility.reason,
    driverCompensation: round(driverCompensation),
    platformFee: round(platformFee),
    riderCharge: round(riderCharge)
  };
}

/**
 * Recalculate fare for early stop (ride ended before original destination)
 */
export function recalculateFareForEarlyStop(params: {
  originalEstimatedKm: number;
  actualDistanceKm: number;
  originalEstimatedMin: number;
  actualDurationMin: number;
  waitingStartedAt?: Date | null;
  tripEndedAt?: Date;
  currencyCode: string;
}): EarlyStopRecalculation {
  const {
    originalEstimatedKm,
    actualDistanceKm,
    originalEstimatedMin,
    actualDurationMin,
    waitingStartedAt,
    tripEndedAt,
    currencyCode
  } = params;

  // Calculate original estimated fare
  const originalFare = calculateEstimatedFare(originalEstimatedKm, originalEstimatedMin);

  // Calculate actual fare based on distance/time traveled
  const actualFareBreakdown = calculateCompleteFare({
    distanceKm: actualDistanceKm,
    durationMin: actualDurationMin,
    estimatedDurationMin: originalEstimatedMin,
    waitingStartedAt,
    tripEndedAt,
    currencyCode
  });

  return {
    originalEstimatedKm: round(originalEstimatedKm),
    actualDistanceKm: round(actualDistanceKm),
    originalEstimatedMin: round(originalEstimatedMin),
    actualDurationMin: round(actualDurationMin),
    originalFare: round(originalFare),
    recalculatedFare: actualFareBreakdown.totalFare,
    difference: round(originalFare - actualFareBreakdown.totalFare)
  };
}

/**
 * Calculate estimated fare (for ride request display)
 */
export function calculateEstimatedFare(
  estimatedDistanceKm: number,
  estimatedDurationMin: number,
  fareMultiplier: number = 1.0
): number {
  const multiplier = Math.max(1.0, fareMultiplier);
  const baseFare = BASE_FARE * multiplier;
  const distanceFare = estimatedDistanceKm * DISTANCE_RATE_PER_KM * multiplier;
  const timeFare = estimatedDurationMin * TIME_RATE_PER_MINUTE * multiplier;
  return round(baseFare + distanceFare + timeFare);
}

/**
 * Check if rider can cancel without penalty
 * Returns true if within free waiting period and no paid waiting has started
 */
export function canCancelWithoutPenalty(
  waitingStartedAt: Date | null,
  currentTime: Date = new Date()
): { canCancel: boolean; reason: string } {
  if (!waitingStartedAt) {
    return { canCancel: true, reason: "No waiting period has started" };
  }

  const waitingBreakdown = calculateWaitingTime(waitingStartedAt, currentTime);

  if (waitingBreakdown.paidMinutes > 0) {
    return {
      canCancel: false,
      reason: `Paid waiting has begun (${waitingBreakdown.paidMinutes.toFixed(1)} minutes). Cancellation fee applies.`
    };
  }

  return {
    canCancel: true,
    reason: `Within free waiting period (${waitingBreakdown.freeMinutes.toFixed(1)}/${WAITING_FREE_MINUTES} minutes)`
  };
}

/**
 * Check if driver cancellation reason is justified for compensation
 */
export function isJustifiedCancellation(reason: DriverCancelReason): boolean {
  return JUSTIFIED_CANCEL_REASONS.includes(reason);
}

/**
 * Generate fare receipt for rider
 */
export function generateFareReceipt(params: {
  rideId: string;
  fareBreakdown: FareBreakdown;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  durationMin: number;
  driverName: string;
  completedAt: Date;
}): {
  receiptId: string;
  summary: string;
  items: { label: string; amount: number }[];
  total: number;
  currency: string;
} {
  const {
    rideId,
    fareBreakdown,
    pickupAddress,
    dropoffAddress,
    distanceKm,
    durationMin,
    driverName,
    completedAt
  } = params;

  const items: { label: string; amount: number }[] = [
    { label: "Base fare", amount: fareBreakdown.baseFare }
  ];

  if (fareBreakdown.distanceFare > 0) {
    items.push({ label: `Distance (${distanceKm.toFixed(1)} km)`, amount: fareBreakdown.distanceFare });
  }

  if (fareBreakdown.timeFare > 0) {
    items.push({ label: `Time (${durationMin.toFixed(0)} min)`, amount: fareBreakdown.timeFare });
  }

  if (fareBreakdown.waitingFee > 0) {
    items.push({ label: "Waiting time", amount: fareBreakdown.waitingFee });
  }

  if (fareBreakdown.trafficFee > 0) {
    items.push({ label: "Traffic adjustment", amount: fareBreakdown.trafficFee });
  }

  const summary = `Trip from ${pickupAddress} to ${dropoffAddress} with ${driverName} on ${completedAt.toLocaleDateString()}`;

  return {
    receiptId: `RCP-${rideId.substring(0, 8).toUpperCase()}`,
    summary,
    items,
    total: fareBreakdown.totalFare,
    currency: fareBreakdown.currency
  };
}

// ========================
// UTILITY FUNCTIONS
// ========================

function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ========================
// FARE ESTIMATE RANGE
// ========================

/**
 * Calculate fare estimate range (min/max) for ride request
 * Accounts for typical traffic variance
 */
export function calculateFareEstimateRange(
  estimatedDistanceKm: number,
  estimatedDurationMin: number,
  fareMultiplier: number = 1.0
): { min: number; max: number; estimate: number } {
  const estimate = calculateEstimatedFare(estimatedDistanceKm, estimatedDurationMin, fareMultiplier);
  
  const multiplier = Math.max(1.0, fareMultiplier);
  const minFare = estimate;
  const maxFare = estimate + (estimatedDurationMin * 0.3 * TRAFFIC_OVERRUN_RATE_PER_MINUTE * multiplier);
  
  return {
    min: round(minFare),
    max: round(maxFare),
    estimate: round(estimate)
  };
}

/**
 * Phase 22 - Ride Lifecycle State Machine
 * 
 * Enforces valid state transitions for the ride lifecycle.
 * Prevents invalid jumps (e.g., REQUESTED → IN_PROGRESS must fail).
 */

export type RideStatus = 
  | "requested"
  | "matching"
  | "accepted"
  | "driver_en_route"
  | "arrived"
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled";

// Valid state transitions map
// Key: current status, Value: array of valid next statuses
const VALID_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  requested: ["matching", "cancelled"],
  matching: ["accepted", "cancelled"],
  accepted: ["driver_en_route", "cancelled"],
  driver_en_route: ["arrived", "cancelled"],
  arrived: ["waiting", "in_progress", "cancelled"],
  waiting: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

// Matching window duration in seconds
export const MATCHING_WINDOW_SECONDS = 10;

// Waiting time thresholds in minutes
export const WAITING_FREE_MINUTES = 2;
export const WAITING_PAID_MINUTES = 5;
export const WAITING_BONUS_MINUTES = 4;
export const TOTAL_WAITING_MINUTES = WAITING_FREE_MINUTES + WAITING_PAID_MINUTES + WAITING_BONUS_MINUTES;

// Driver movement thresholds for cancellation compensation
export const MIN_DISTANCE_KM_FOR_COMPENSATION = 1;
export const MIN_DURATION_SEC_FOR_COMPENSATION = 60;

// Safety check threshold
export const IDLE_ALERT_MINUTES = 4;

export interface TransitionResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates if a state transition is allowed
 */
export function isValidTransition(from: RideStatus, to: RideStatus): TransitionResult {
  // Terminal states cannot transition
  if (from === "completed" || from === "cancelled") {
    return {
      valid: false,
      error: `Cannot transition from terminal state '${from}'`
    };
  }

  // Check if target state is valid from current state
  const validNextStates = VALID_TRANSITIONS[from];
  if (!validNextStates.includes(to)) {
    return {
      valid: false,
      error: `Invalid transition: '${from}' → '${to}'. Valid transitions are: ${validNextStates.join(", ") || "none"}`
    };
  }

  return { valid: true };
}

/**
 * Gets all valid next states from current state
 */
export function getValidNextStates(current: RideStatus): RideStatus[] {
  return VALID_TRANSITIONS[current] || [];
}

/**
 * Checks if matching window has expired
 */
export function isMatchingExpired(matchingExpiresAt: Date | null): boolean {
  if (!matchingExpiresAt) return false;
  return new Date() > matchingExpiresAt;
}

/**
 * Creates matching expiration timestamp (current time + 10 seconds)
 */
export function createMatchingExpiration(): Date {
  const expiration = new Date();
  expiration.setSeconds(expiration.getSeconds() + MATCHING_WINDOW_SECONDS);
  return expiration;
}

/**
 * Determines if driver is eligible for cancellation compensation
 * Based on driver movement before pickup
 */
export function isDriverEligibleForCompensation(
  distanceKm: number,
  durationSec: number
): { eligible: boolean; reason: string } {
  if (distanceKm >= MIN_DISTANCE_KM_FOR_COMPENSATION) {
    return {
      eligible: true,
      reason: `Driver moved ${distanceKm.toFixed(2)} km (threshold: ${MIN_DISTANCE_KM_FOR_COMPENSATION} km)`
    };
  }
  
  if (durationSec >= MIN_DURATION_SEC_FOR_COMPENSATION) {
    return {
      eligible: true,
      reason: `Driver spent ${durationSec} seconds en route (threshold: ${MIN_DURATION_SEC_FOR_COMPENSATION} seconds)`
    };
  }

  return {
    eligible: false,
    reason: `Driver movement below compensation threshold (${distanceKm.toFixed(2)} km, ${durationSec} seconds)`
  };
}

/**
 * Calculates waiting time breakdown
 */
export function calculateWaitingTime(
  waitingStartedAt: Date | null,
  endTime: Date = new Date()
): {
  totalMinutes: number;
  freeMinutes: number;
  paidMinutes: number;
  bonusMinutes: number;
} {
  if (!waitingStartedAt) {
    return { totalMinutes: 0, freeMinutes: 0, paidMinutes: 0, bonusMinutes: 0 };
  }

  const totalMinutes = (endTime.getTime() - waitingStartedAt.getTime()) / (1000 * 60);

  // First 2 minutes are free
  const freeMinutes = Math.min(totalMinutes, WAITING_FREE_MINUTES);
  
  // Next 5 minutes are paid
  const remainingAfterFree = Math.max(0, totalMinutes - WAITING_FREE_MINUTES);
  const paidMinutes = Math.min(remainingAfterFree, WAITING_PAID_MINUTES);
  
  // Additional 4 minutes are bonus
  const remainingAfterPaid = Math.max(0, remainingAfterFree - WAITING_PAID_MINUTES);
  const bonusMinutes = Math.min(remainingAfterPaid, WAITING_BONUS_MINUTES);

  return {
    totalMinutes,
    freeMinutes,
    paidMinutes,
    bonusMinutes
  };
}

/**
 * Checks if safety alert should be triggered
 * Alert if no movement for >= 4 minutes during IN_PROGRESS
 */
export function shouldTriggerSafetyAlert(
  lastMovementAt: Date | null,
  idleAlertSentAt: Date | null,
  currentStatus: RideStatus
): boolean {
  // Only check during active rides
  if (currentStatus !== "in_progress") {
    return false;
  }

  // Need movement timestamp
  if (!lastMovementAt) {
    return false;
  }

  // Don't send duplicate alerts
  if (idleAlertSentAt && idleAlertSentAt > lastMovementAt) {
    return false;
  }

  const idleMinutes = (Date.now() - lastMovementAt.getTime()) / (1000 * 60);
  return idleMinutes >= IDLE_ALERT_MINUTES;
}

/**
 * All possible ride statuses for reference
 */
export const ALL_RIDE_STATUSES: RideStatus[] = [
  "requested",
  "matching",
  "accepted",
  "driver_en_route",
  "arrived",
  "waiting",
  "in_progress",
  "completed",
  "cancelled"
];

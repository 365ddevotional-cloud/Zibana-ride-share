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

// Grace period: rider can cancel free within this time after driver accepts
export const RIDER_CANCEL_GRACE_PERIOD_MS = 3 * 60 * 1000; // 3 minutes

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

// ========================
// STEP B - Role-Based Action Permissions
// ========================

export type ActionRole = "rider" | "driver" | "system";

export type RideAction = 
  | "request_ride"        // Rider creates ride
  | "accept_ride"         // Driver accepts matching ride
  | "start_pickup"        // Driver starts navigation to rider
  | "arrive"              // Driver arrives at pickup
  | "start_waiting"       // System enters waiting mode
  | "start_trip"          // Driver starts the trip
  | "complete_trip"       // Driver completes the trip
  | "cancel_ride";        // Rider or Driver cancels

// Map actions to who can perform them
const ACTION_PERMISSIONS: Record<RideAction, ActionRole[]> = {
  request_ride: ["rider"],
  accept_ride: ["driver"],
  start_pickup: ["driver", "system"], // Driver tap or GPS detection
  arrive: ["driver", "system"],        // Driver tap or arrival radius
  start_waiting: ["system"],           // Automatic after arrival
  start_trip: ["driver"],
  complete_trip: ["driver"],
  cancel_ride: ["rider", "driver"],    // Both can cancel with different rules
};

// Map actions to required current status
const ACTION_REQUIRED_STATUS: Record<RideAction, RideStatus[]> = {
  request_ride: [], // No prior status required
  accept_ride: ["matching"],
  start_pickup: ["accepted"],
  arrive: ["driver_en_route"],
  start_waiting: ["arrived"],
  start_trip: ["waiting", "arrived"], // Can skip waiting if rider is ready
  complete_trip: ["in_progress"],
  cancel_ride: ["requested", "matching", "accepted", "driver_en_route", "arrived", "waiting", "in_progress"],
};

// Rider cancellation allowed statuses
const RIDER_CAN_CANCEL: RideStatus[] = [
  "requested",
  "matching",
  "accepted",
  "driver_en_route"
];

// Driver cancellation allowed statuses
const DRIVER_CAN_CANCEL: RideStatus[] = [
  "arrived",
  "waiting",
  "in_progress"
];

export interface ActionValidationResult {
  allowed: boolean;
  error?: string;
  requiresFee?: boolean;
  requiresReason?: boolean;
  compensationEligible?: boolean;
  withinGracePeriod?: boolean;
}

/**
 * Validates if a role can perform an action on a ride
 */
export function validateAction(
  action: RideAction,
  role: ActionRole,
  currentStatus: RideStatus | null,
  options?: {
    isAssignedDriver?: boolean;
    matchingExpiresAt?: Date | null;
    driverMovement?: { distanceKm: number; durationSec: number };
    driverAcceptedAt?: Date | null;
  }
): ActionValidationResult {
  // Check role permission
  const allowedRoles = ACTION_PERMISSIONS[action];
  if (!allowedRoles.includes(role)) {
    return {
      allowed: false,
      error: `${role} cannot perform action '${action}'`
    };
  }

  // Check status requirement
  const requiredStatuses = ACTION_REQUIRED_STATUS[action];
  if (requiredStatuses.length > 0 && currentStatus && !requiredStatuses.includes(currentStatus)) {
    return {
      allowed: false,
      error: `Cannot '${action}' when ride status is '${currentStatus}'. Required: ${requiredStatuses.join(", ")}`
    };
  }

  // Special validations per action
  switch (action) {
    case "accept_ride":
      // Check matching window
      if (options?.matchingExpiresAt && isMatchingExpired(options.matchingExpiresAt)) {
        return {
          allowed: false,
          error: "Matching window has expired. Cannot accept this ride."
        };
      }
      break;

    case "start_pickup":
    case "arrive":
    case "start_trip":
    case "complete_trip":
      // Only assigned driver can perform these
      if (role === "driver" && !options?.isAssignedDriver) {
        return {
          allowed: false,
          error: "Only the assigned driver can perform this action"
        };
      }
      break;

    case "cancel_ride":
      return validateCancellation(role, currentStatus, options?.driverMovement, options?.driverAcceptedAt);
  }

  return { allowed: true };
}

/**
 * Validates cancellation based on role and status
 */
function validateCancellation(
  role: ActionRole,
  currentStatus: RideStatus | null,
  driverMovement?: { distanceKm: number; durationSec: number },
  driverAcceptedAt?: Date | null
): ActionValidationResult {
  if (!currentStatus) {
    return { allowed: false, error: "No ride to cancel" };
  }

  if (role === "rider") {
    if (!RIDER_CAN_CANCEL.includes(currentStatus)) {
      return {
        allowed: false,
        error: `Rider cannot cancel when status is '${currentStatus}'. Trip is in progress.`
      };
    }

    // Before driver accepts → always free
    if (currentStatus === "requested" || currentStatus === "matching") {
      return { allowed: true };
    }

    // After driver accepts: check 3-minute grace period
    if (driverAcceptedAt) {
      const timeSinceAccept = Date.now() - driverAcceptedAt.getTime();
      if (timeSinceAccept <= RIDER_CANCEL_GRACE_PERIOD_MS) {
        return { allowed: true, withinGracePeriod: true };
      }
    }

    // After grace period: check if fees apply (driver moved)
    if ((currentStatus === "driver_en_route" || currentStatus === "accepted") && driverMovement) {
      const compensation = isDriverEligibleForCompensation(
        driverMovement.distanceKm,
        driverMovement.durationSec
      );
      if (compensation.eligible) {
        return {
          allowed: true,
          requiresFee: true,
          compensationEligible: true
        };
      }
    }

    // After grace period, driver en route but minimal movement → still apply fee based on time
    if (currentStatus === "driver_en_route" && driverAcceptedAt) {
      const timeSinceAccept = Date.now() - driverAcceptedAt.getTime();
      if (timeSinceAccept > RIDER_CANCEL_GRACE_PERIOD_MS) {
        return {
          allowed: true,
          requiresFee: true,
          compensationEligible: true
        };
      }
    }

    return { allowed: true };
  }

  if (role === "driver") {
    if (!DRIVER_CAN_CANCEL.includes(currentStatus)) {
      return {
        allowed: false,
        error: `Driver cannot cancel when status is '${currentStatus}'`
      };
    }

    // Driver must provide reason for in_progress cancellation
    if (currentStatus === "in_progress") {
      return {
        allowed: true,
        requiresReason: true
      };
    }

    return { allowed: true };
  }

  return { allowed: false, error: "Invalid role for cancellation" };
}

/**
 * Gets the target status for an action
 */
export function getTargetStatus(action: RideAction): RideStatus | null {
  const actionToStatus: Record<RideAction, RideStatus | null> = {
    request_ride: "matching",
    accept_ride: "accepted",
    start_pickup: "driver_en_route",
    arrive: "arrived",
    start_waiting: "waiting",
    start_trip: "in_progress",
    complete_trip: "completed",
    cancel_ride: "cancelled",
  };
  return actionToStatus[action];
}

/**
 * Standard cancellation reasons for drivers
 */
export const DRIVER_CANCEL_REASONS = [
  "rider_no_show",
  "rider_changed_destination",
  "rider_requested_cancellation",
  "vehicle_issue",
  "personal_emergency",
  "unsafe_location",
  "other"
] as const;

export type DriverCancelReason = typeof DRIVER_CANCEL_REASONS[number];

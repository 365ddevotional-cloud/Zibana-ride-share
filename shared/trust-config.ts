/**
 * PHASE 3: RATINGS, BEHAVIOR SIGNALS & TRUST SCORING
 * Enterprise-grade, abuse-resistant trust system configuration
 * 
 * LOCK STATUS: TRUST_ENGINE_LOCKED = true
 * This engine cannot be disabled without code modification.
 */

// =============================================
// TRUST ENGINE LOCK
// =============================================

export const TRUST_ENGINE_LOCKED = true;

export function assertTrustEngineLocked(): void {
  if (!TRUST_ENGINE_LOCKED) {
    throw new Error("TRUST_ENGINE_LOCKED must be true. This is a security requirement.");
  }
}

// =============================================
// RATING CONFIGURATION
// =============================================

export const RATING_CONFIG = {
  MIN_SCORE: 1,
  MAX_SCORE: 5,
  RATING_WINDOW_HOURS: 72,
  MIN_RATINGS_FOR_DISPLAY: 5,
} as const;

// =============================================
// TRUST SCORE CONFIGURATION
// =============================================

export const TRUST_SCORE_CONFIG = {
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  DEFAULT_SCORE: 75,
  
  THRESHOLD_LOW: 40,
  THRESHOLD_HIGH: 85,
  
  MIN_TRIPS_FOR_CALCULATION: 3,
  
  WEIGHTS: {
    RATING_AVERAGE: 0.40,
    BEHAVIOR_SIGNALS: 0.30,
    ACCOUNT_AGE: 0.10,
    TRIP_COMPLETION_RATIO: 0.20,
  },
  
  ACCOUNT_AGE_MAX_DAYS: 365,
} as const;

// =============================================
// BEHAVIOR SIGNAL TYPES
// =============================================

export const DRIVER_SIGNAL_TYPES = [
  "GPS_INTERRUPTION",
  "TRIP_CANCELLATION",
  "LATE_ARRIVAL",
  "ROUTE_DEVIATION",
  "APP_FORCE_CLOSE",
  "NO_SHOW",
  "TRIP_COMPLETED",
  "ON_TIME_ARRIVAL",
  "DIRECT_ROUTE",
] as const;

export const RIDER_SIGNAL_TYPES = [
  "NO_SHOW",
  "CANCELLATION",
  "PAYMENT_FAILURE",
  "DISPUTE_FILED",
  "TRIP_COMPLETED",
  "ON_TIME_PICKUP",
  "PAYMENT_SUCCESS",
] as const;

export type DriverSignalType = typeof DRIVER_SIGNAL_TYPES[number];
export type RiderSignalType = typeof RIDER_SIGNAL_TYPES[number];
export type BehaviorSignalType = DriverSignalType | RiderSignalType;

// =============================================
// SIGNAL WEIGHTS (Positive = Good, Negative = Bad)
// =============================================

export const SIGNAL_WEIGHTS: Record<BehaviorSignalType, number> = {
  GPS_INTERRUPTION: -5,
  TRIP_CANCELLATION: -10,
  LATE_ARRIVAL: -3,
  ROUTE_DEVIATION: -2,
  APP_FORCE_CLOSE: -3,
  NO_SHOW: -15,
  TRIP_COMPLETED: +5,
  ON_TIME_ARRIVAL: +3,
  DIRECT_ROUTE: +2,
  CANCELLATION: -8,
  PAYMENT_FAILURE: -10,
  DISPUTE_FILED: -5,
  ON_TIME_PICKUP: +3,
  PAYMENT_SUCCESS: +2,
};

// =============================================
// ANTI-MANIPULATION CONFIGURATION
// =============================================

export const ANTI_MANIPULATION_CONFIG = {
  RATING_BOMB_THRESHOLD: 3,
  RATING_BOMB_WINDOW_HOURS: 24,
  
  MIN_SAMPLE_SIZE: 5,
  LOW_SAMPLE_DAMPENING_FACTOR: 0.7,
  
  OUTLIER_DETECTION_ENABLED: true,
  OUTLIER_THRESHOLD_STDDEV: 2.5,
  
  RETALIATION_WINDOW_MINUTES: 30,
  RETALIATION_DAMPENING_FACTOR: 0.5,
  
  COLLUSION_DETECTION_ENABLED: true,
  COLLUSION_PATTERN_THRESHOLD: 5,
} as const;

// =============================================
// HELPER FUNCTIONS
// =============================================

export function isValidRatingScore(score: number): boolean {
  return Number.isInteger(score) && 
         score >= RATING_CONFIG.MIN_SCORE && 
         score <= RATING_CONFIG.MAX_SCORE;
}

export function isRatingWindowOpen(tripCompletedAt: Date): boolean {
  const now = new Date();
  const windowEnd = new Date(tripCompletedAt);
  windowEnd.setHours(windowEnd.getHours() + RATING_CONFIG.RATING_WINDOW_HOURS);
  return now <= windowEnd;
}

export function clampTrustScore(score: number): number {
  return Math.max(
    TRUST_SCORE_CONFIG.MIN_SCORE,
    Math.min(TRUST_SCORE_CONFIG.MAX_SCORE, Math.round(score))
  );
}

export function getTrustScoreLevel(score: number): "low" | "medium" | "high" {
  if (score < TRUST_SCORE_CONFIG.THRESHOLD_LOW) return "low";
  if (score >= TRUST_SCORE_CONFIG.THRESHOLD_HIGH) return "high";
  return "medium";
}

export function calculateAccountAgeFactor(createdAt: Date): number {
  const now = new Date();
  const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(1, ageDays / TRUST_SCORE_CONFIG.ACCOUNT_AGE_MAX_DAYS);
}

export function calculateCompletionRatio(completed: number, total: number): number {
  if (total === 0) return 1;
  return completed / total;
}

export function applyLowSampleDampening(score: number, sampleSize: number): number {
  if (sampleSize >= ANTI_MANIPULATION_CONFIG.MIN_SAMPLE_SIZE) {
    return score;
  }
  const dampening = ANTI_MANIPULATION_CONFIG.LOW_SAMPLE_DAMPENING_FACTOR;
  const defaultScore = TRUST_SCORE_CONFIG.DEFAULT_SCORE;
  return (score * dampening) + (defaultScore * (1 - dampening));
}

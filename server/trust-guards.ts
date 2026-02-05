/**
 * PHASE 3: TRUST SCORE ENGINE & ANTI-MANIPULATION GUARDS
 * Enterprise-grade, abuse-resistant trust system
 * 
 * LOCK STATUS: TRUST_ENGINE_LOCKED = true
 */

import { storage } from "./storage";
import {
  TRUST_ENGINE_LOCKED,
  assertTrustEngineLocked,
  RATING_CONFIG,
  TRUST_SCORE_CONFIG,
  ANTI_MANIPULATION_CONFIG,
  SIGNAL_WEIGHTS,
  isValidRatingScore,
  isRatingWindowOpen,
  clampTrustScore,
  getTrustScoreLevel,
  calculateAccountAgeFactor,
  calculateCompletionRatio,
  applyLowSampleDampening,
  type BehaviorSignalType,
} from "@shared/trust-config";
import type { TripRating, BehaviorSignal, UserTrustProfile } from "@shared/schema";

// =============================================
// RATING SUBMISSION
// =============================================

export interface RatingSubmissionResult {
  success: boolean;
  ratingId?: string;
  error?: string;
  code?: string;
  manipulationDetected?: boolean;
  manipulationType?: string;
}

export async function submitRating(
  tripId: string,
  raterId: string,
  rateeId: string,
  score: number,
  ratingRole: "rider_to_driver" | "driver_to_rider",
  tripCompletedAt: Date
): Promise<RatingSubmissionResult> {
  assertTrustEngineLocked();

  if (!isValidRatingScore(score)) {
    return {
      success: false,
      error: `Rating must be between ${RATING_CONFIG.MIN_SCORE} and ${RATING_CONFIG.MAX_SCORE}`,
      code: "INVALID_SCORE",
    };
  }

  if (!isRatingWindowOpen(tripCompletedAt)) {
    return {
      success: false,
      error: "Rating window has expired",
      code: "RATING_WINDOW_EXPIRED",
    };
  }

  const existingRating = await storage.getTripRatingByRater(tripId, raterId);
  if (existingRating) {
    return {
      success: false,
      error: "You have already rated this trip",
      code: "ALREADY_RATED",
    };
  }

  const manipulationCheck = await checkRatingManipulation(raterId, rateeId, score);
  
  let effectiveWeight = "1.0000";
  let isDampened = false;
  let dampeningReason: string | undefined;

  if (manipulationCheck.detected) {
    effectiveWeight = manipulationCheck.adjustedWeight || "0.5000";
    isDampened = true;
    dampeningReason = manipulationCheck.type;
  }

  const rating = await storage.createTripRating({
    tripId,
    raterId,
    rateeId,
    ratingRole,
    score,
    tripCompletedAt,
  });

  if (isDampened) {
    await storage.updateTripRatingWeight(rating.id, effectiveWeight, isDampened, dampeningReason);
  }

  await storage.createTrustAuditLog({
    userId: rateeId,
    tripId,
    ratingId: rating.id,
    actionType: "RATING_SUBMITTED",
    actionDetails: JSON.stringify({
      raterId,
      score,
      ratingRole,
      effectiveWeight,
      isDampened,
    }),
    manipulationDetected: manipulationCheck.detected,
    manipulationType: manipulationCheck.type,
  });

  await recalculateTrustScore(rateeId);

  // PAIRING BLOCK: Create permanent block if rider rates driver < 3 stars
  if (ratingRole === "rider_to_driver" && score < 3) {
    const existingBlock = await storage.getPairingBlock(raterId, rateeId);
    if (!existingBlock) {
      await storage.createPairingBlock({
        riderId: raterId,
        driverId: rateeId,
        reason: "low_rating",
        tripId,
        ratingScore: score,
      });
      
      const sendAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createScheduledRatingNotification({
        ratingId: rating.id,
        tripId,
        recipientUserId: raterId,
        recipientRole: "rider",
        title: "Feedback Received",
        message: "Thanks for your feedback. For safety reasons, you won't be matched with this driver again. Ratings help us create safer rides for everyone.",
        sendAt,
      });

      await storage.createScheduledRatingNotification({
        ratingId: rating.id,
        tripId,
        recipientUserId: rateeId,
        recipientRole: "driver",
        title: "Trip Feedback",
        message: "A rider has shared feedback on a recent trip. Ratings are mutual and help improve future matches.",
        sendAt,
      });
    }
  }
  
  // PAIRING BLOCK: Also apply same logic if driver rates rider < 3
  if (ratingRole === "driver_to_rider" && score < 3) {
    const existingBlock = await storage.getPairingBlock(rateeId, raterId);
    if (!existingBlock) {
      await storage.createPairingBlock({
        riderId: rateeId,
        driverId: raterId,
        reason: "low_rating_by_driver",
        tripId,
        ratingScore: score,
      });
      
      const sendAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createScheduledRatingNotification({
        ratingId: rating.id,
        tripId,
        recipientUserId: raterId,
        recipientRole: "driver",
        title: "Feedback Received",
        message: "Thanks for your feedback. For safety reasons, you won't be matched with this rider again. Ratings help us create safer rides for everyone.",
        sendAt,
      });

      await storage.createScheduledRatingNotification({
        ratingId: rating.id,
        tripId,
        recipientUserId: rateeId,
        recipientRole: "rider",
        title: "Trip Feedback",
        message: "A driver has shared feedback on a recent trip. Ratings are mutual and help improve future matches.",
        sendAt,
      });
    }
  }

  return {
    success: true,
    ratingId: rating.id,
    manipulationDetected: manipulationCheck.detected,
    manipulationType: manipulationCheck.type,
  };
}

// =============================================
// MANIPULATION DETECTION
// =============================================

interface ManipulationCheckResult {
  detected: boolean;
  type?: string;
  adjustedWeight?: string;
}

async function checkRatingManipulation(
  raterId: string,
  rateeId: string,
  score: number
): Promise<ManipulationCheckResult> {
  const recentRatings = await storage.getRecentRatingsForUser(
    rateeId,
    ANTI_MANIPULATION_CONFIG.RATING_BOMB_WINDOW_HOURS
  );

  if (recentRatings.length >= ANTI_MANIPULATION_CONFIG.RATING_BOMB_THRESHOLD) {
    const lowRatings = recentRatings.filter(r => r.score <= 2);
    if (lowRatings.length >= ANTI_MANIPULATION_CONFIG.RATING_BOMB_THRESHOLD) {
      return {
        detected: true,
        type: "RATING_BOMB_DETECTED",
        adjustedWeight: String(ANTI_MANIPULATION_CONFIG.LOW_SAMPLE_DAMPENING_FACTOR),
      };
    }
  }

  const recentRatingsFromRater = recentRatings.filter(r => r.raterId === raterId);
  if (recentRatingsFromRater.length > 0) {
    const timeSinceLastRating = Date.now() - new Date(recentRatingsFromRater[0].createdAt!).getTime();
    const retaliationWindowMs = ANTI_MANIPULATION_CONFIG.RETALIATION_WINDOW_MINUTES * 60 * 1000;
    
    if (timeSinceLastRating < retaliationWindowMs) {
      return {
        detected: true,
        type: "RETALIATION_SUSPECTED",
        adjustedWeight: String(ANTI_MANIPULATION_CONFIG.RETALIATION_DAMPENING_FACTOR),
      };
    }
  }

  if (ANTI_MANIPULATION_CONFIG.OUTLIER_DETECTION_ENABLED && recentRatings.length >= ANTI_MANIPULATION_CONFIG.MIN_SAMPLE_SIZE) {
    const scores = recentRatings.map(r => r.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length);
    
    if (stdDev > 0) {
      const zScore = Math.abs(score - mean) / stdDev;
      if (zScore > ANTI_MANIPULATION_CONFIG.OUTLIER_THRESHOLD_STDDEV) {
        return {
          detected: true,
          type: "OUTLIER_RATING",
          adjustedWeight: "0.7500",
        };
      }
    }
  }

  return { detected: false };
}

// =============================================
// BEHAVIOR SIGNAL CAPTURE
// =============================================

export interface SignalCaptureResult {
  success: boolean;
  signalId?: string;
  error?: string;
}

export async function captureBehaviorSignal(
  userId: string,
  signalType: BehaviorSignalType,
  category: "driver" | "rider",
  tripId?: string,
  metadata?: Record<string, unknown>
): Promise<SignalCaptureResult> {
  assertTrustEngineLocked();

  const signalWeight = SIGNAL_WEIGHTS[signalType] || 0;

  const signal = await storage.createBehaviorSignal({
    userId,
    tripId: tripId || null,
    category,
    signalType,
    signalValue: String(signalWeight),
    metadata: metadata ? JSON.stringify(metadata) : null,
  });

  await storage.createTrustAuditLog({
    userId,
    tripId,
    signalId: signal.id,
    actionType: "SIGNAL_CAPTURED",
    actionDetails: JSON.stringify({
      signalType,
      category,
      signalValue: signalWeight,
    }),
  });

  await recalculateTrustScore(userId);

  return {
    success: true,
    signalId: signal.id,
  };
}

// =============================================
// TRUST SCORE CALCULATION
// =============================================

export async function recalculateTrustScore(userId: string): Promise<UserTrustProfile> {
  assertTrustEngineLocked();

  const profile = await storage.getOrCreateUserTrustProfile(userId);
  const previousScore = profile.trustScore;

  const ratings = await storage.getUserRatingsReceived(userId);
  const signals = await storage.getUserBehaviorSignals(userId);

  let ratingComponent: number = TRUST_SCORE_CONFIG.DEFAULT_SCORE;
  if (ratings.length > 0) {
    const validRatings = ratings.filter(r => !r.isOutlier);
    if (validRatings.length > 0) {
      const weightedSum = validRatings.reduce((sum, r) => {
        const weight = parseFloat(r.effectiveWeight || "1");
        return sum + (r.score * weight);
      }, 0);
      const totalWeight = validRatings.reduce((sum, r) => sum + parseFloat(r.effectiveWeight || "1"), 0);
      const avgRating = weightedSum / totalWeight;
      ratingComponent = (avgRating / RATING_CONFIG.MAX_SCORE) * 100;
    }
  }

  ratingComponent = applyLowSampleDampening(ratingComponent, ratings.length);

  let signalScore = 0;
  for (const signal of signals) {
    signalScore += parseFloat(signal.signalValue);
  }
  const normalizedSignalScore = Math.max(0, Math.min(100, 50 + signalScore));

  const userRole = await storage.getUserRole(userId);
  const accountCreatedAt = userRole?.createdAt ? new Date(userRole.createdAt) : new Date();
  const accountAgeFactor = calculateAccountAgeFactor(accountCreatedAt);

  const completedTrips = profile.completedTrips;
  const totalTrips = profile.totalTrips;
  const completionRatio = calculateCompletionRatio(completedTrips, totalTrips);
  const completionComponent = completionRatio * 100;

  const weights = TRUST_SCORE_CONFIG.WEIGHTS;
  const rawScore = 
    (ratingComponent * weights.RATING_AVERAGE) +
    (normalizedSignalScore * weights.BEHAVIOR_SIGNALS) +
    (accountAgeFactor * 100 * weights.ACCOUNT_AGE) +
    (completionComponent * weights.TRIP_COMPLETION_RATIO);

  const newTrustScore = clampTrustScore(rawScore);
  const trustScoreLevel = getTrustScoreLevel(newTrustScore);

  const positiveSignals = signals.filter(s => parseFloat(s.signalValue) > 0).length;
  const negativeSignals = signals.filter(s => parseFloat(s.signalValue) < 0).length;

  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : null;

  await storage.updateUserTrustProfile(userId, {
    trustScore: newTrustScore as number,
    trustScoreLevel,
    averageRating: avgRating ? String(avgRating.toFixed(2)) : undefined,
    totalRatingsReceived: ratings.length as number,
    positiveSignalCount: positiveSignals as number,
    negativeSignalCount: negativeSignals as number,
    signalScore: String(signalScore),
    completionRatio: String(completionRatio.toFixed(4)),
    accountAgeFactor: String(accountAgeFactor.toFixed(4)),
    lastRecalculatedAt: new Date(),
    recalculationCount: ((profile.recalculationCount || 0) + 1) as number,
  });

  if (newTrustScore !== previousScore) {
    await storage.createTrustAuditLog({
      userId,
      actionType: "TRUST_SCORE_RECALCULATED",
      actionDetails: JSON.stringify({
        ratingComponent,
        signalScore: normalizedSignalScore,
        accountAgeFactor,
        completionRatio,
      }),
      previousTrustScore: previousScore,
      newTrustScore,
    });
  }

  return (await storage.getUserTrustProfile(userId))!;
}

// =============================================
// TRUST SCORE HOOKS (FOR FUTURE ENFORCEMENT)
// =============================================

export function trustScoreThresholdLow(): number {
  return TRUST_SCORE_CONFIG.THRESHOLD_LOW;
}

export function trustScoreThresholdHigh(): number {
  return TRUST_SCORE_CONFIG.THRESHOLD_HIGH;
}

export async function isUserTrustScoreLow(userId: string): Promise<boolean> {
  const profile = await storage.getUserTrustProfile(userId);
  if (!profile) return false;
  return profile.trustScore < trustScoreThresholdLow();
}

export async function isUserTrustScoreHigh(userId: string): Promise<boolean> {
  const profile = await storage.getUserTrustProfile(userId);
  if (!profile) return false;
  return profile.trustScore >= trustScoreThresholdHigh();
}

// =============================================
// ADMIN READ-ONLY ACCESS
// =============================================

export async function getAdminTrustView(userId: string) {
  assertTrustEngineLocked();
  return storage.getUserTrustDetails(userId);
}

export async function getAllTrustProfiles() {
  assertTrustEngineLocked();
  return storage.getAllUserTrustProfiles();
}

export async function getAllTrustAuditLogs() {
  assertTrustEngineLocked();
  return storage.getAllTrustAuditLogs();
}

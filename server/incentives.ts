import { storage } from "./storage";
import type { IncentiveProgram, IncentiveEarning, IncentiveProgress, DriverMatchingScore, UserBehaviorStats } from "@shared/schema";

interface IncentiveCriteria {
  tripCount?: number;
  streakDays?: number;
  peakHours?: { start: number; end: number };
  minRating?: number;
  region?: string;
}

function parseCriteria(criteria: string): IncentiveCriteria {
  try {
    return JSON.parse(criteria);
  } catch {
    return {};
  }
}

const ANTI_FRAUD_CONFIG = {
  MIN_COMPLETED_TRIPS: 5,
  ACTIVATION_WINDOW_DAYS: 30,
  MAX_CANCELLATION_RATE: 0.20,
  MIN_RATING: 4.5,
  CONSECUTIVE_SAME_RIDER_THRESHOLD: 3,
  SHORT_TRIP_DURATION_MINUTES: 2,
};

function detectSameRiderPattern(trips: any[]): boolean {
  if (trips.length < ANTI_FRAUD_CONFIG.CONSECUTIVE_SAME_RIDER_THRESHOLD + 1) return false;
  const sorted = [...trips]
    .filter(t => t.completedAt)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  let consecutiveCount = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].riderId && sorted[i - 1].riderId && sorted[i].riderId === sorted[i - 1].riderId) {
      consecutiveCount++;
      if (consecutiveCount > ANTI_FRAUD_CONFIG.CONSECUTIVE_SAME_RIDER_THRESHOLD) {
        return true;
      }
    } else {
      consecutiveCount = 1;
    }
  }
  return false;
}

function detectShortLoopTrips(trips: any[]): number {
  return trips.filter(t => {
    if (!t.completedAt || !t.createdAt) return false;
    const durationMs = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime();
    const durationMinutes = durationMs / (1000 * 60);
    return durationMinutes < ANTI_FRAUD_CONFIG.SHORT_TRIP_DURATION_MINUTES;
  }).length;
}

function hasValidGpsCoordinates(trip: any): boolean {
  const hasPickup = trip.pickupLat != null && trip.pickupLng != null &&
    parseFloat(String(trip.pickupLat)) !== 0 && parseFloat(String(trip.pickupLng)) !== 0;
  const hasDropoff = trip.dropoffLat != null && trip.dropoffLng != null &&
    parseFloat(String(trip.dropoffLat)) !== 0 && parseFloat(String(trip.dropoffLng)) !== 0;
  return hasPickup || hasDropoff;
}

export async function evaluateDriverForIncentives(driverId: string): Promise<{
  eligible: IncentiveProgram[];
  earned: IncentiveEarning[];
  blocked: boolean;
  blockReason?: string;
  antiFraudFlags?: string[];
}> {
  const riskProfile = await storage.getRiskProfile(driverId);
  if (riskProfile && (riskProfile.level === "high" || riskProfile.level === "critical")) {
    return {
      eligible: [],
      earned: [],
      blocked: true,
      blockReason: `Driver has ${riskProfile.level} risk level and cannot earn incentives`
    };
  }

  const unresolvedEvents = await storage.getFraudEventsByEntityId(driverId);
  const hasUnresolved = unresolvedEvents.some(e => !e.resolvedAt);
  if (hasUnresolved) {
    return {
      eligible: [],
      earned: [],
      blocked: true,
      blockReason: "Driver has unresolved fraud events"
    };
  }

  const driverTrips = await storage.getDriverTripHistory(driverId, {});
  const completedTrips = driverTrips.filter(t => t.status === "completed");
  const driverProfile = await storage.getDriverProfile(driverId);
  const averageRating = driverProfile?.averageRating ? parseFloat(driverProfile.averageRating) : 0;

  const antiFraudFlags: string[] = [];

  const windowDate = new Date();
  windowDate.setDate(windowDate.getDate() - ANTI_FRAUD_CONFIG.ACTIVATION_WINDOW_DAYS);
  const recentCompletedTrips = completedTrips.filter(t =>
    t.completedAt && new Date(t.completedAt) >= windowDate
  );

  if (recentCompletedTrips.length < ANTI_FRAUD_CONFIG.MIN_COMPLETED_TRIPS) {
    antiFraudFlags.push(`Insufficient completed trips in window: ${recentCompletedTrips.length}/${ANTI_FRAUD_CONFIG.MIN_COMPLETED_TRIPS}`);
  }

  const driverCancellations = driverTrips.filter(t => t.status === "cancelled" && t.cancelledBy === "driver");
  const totalRelevant = completedTrips.length + driverCancellations.length;
  const cancellationRate = totalRelevant > 0 ? driverCancellations.length / totalRelevant : 0;

  if (cancellationRate >= ANTI_FRAUD_CONFIG.MAX_CANCELLATION_RATE) {
    antiFraudFlags.push(`High cancellation rate: ${(cancellationRate * 100).toFixed(1)}%`);
  }

  if (averageRating > 0 && averageRating < ANTI_FRAUD_CONFIG.MIN_RATING) {
    antiFraudFlags.push(`Rating below threshold: ${averageRating} < ${ANTI_FRAUD_CONFIG.MIN_RATING}`);
  }

  if (detectSameRiderPattern(completedTrips)) {
    antiFraudFlags.push("Suspicious repeated same-rider pattern detected");
  }

  const shortLoopCount = detectShortLoopTrips(completedTrips);
  if (shortLoopCount > 3) {
    antiFraudFlags.push(`Excessive short-loop trips detected: ${shortLoopCount}`);
  }

  const tripsWithoutGps = completedTrips.filter(t => !hasValidGpsCoordinates(t));
  if (tripsWithoutGps.length > completedTrips.length * 0.3 && completedTrips.length > 0) {
    antiFraudFlags.push(`${tripsWithoutGps.length} trips missing valid GPS coordinates`);
  }

  if (antiFraudFlags.length > 0) {
    return {
      eligible: [],
      earned: [],
      blocked: true,
      blockReason: `Anti-fraud checks failed: ${antiFraudFlags.join("; ")}`,
      antiFraudFlags
    };
  }

  const activePrograms = await storage.getActiveIncentivePrograms();
  const eligiblePrograms: IncentiveProgram[] = [];
  const earnedIncentives: IncentiveEarning[] = [];

  for (const program of activePrograms) {
    const criteria = parseCriteria(program.criteria);
    const existingEarnings = await storage.getDriverEarningsByProgram(driverId, program.id);
    const hasEarned = existingEarnings.some(e => e.status === "pending" || e.status === "approved" || e.status === "paid");
    
    let isEligible = false;

    switch (program.type) {
      case "trip":
        if (criteria.tripCount && completedTrips.length >= criteria.tripCount && !hasEarned) {
          isEligible = true;
        }
        break;

      case "streak":
        if (criteria.streakDays && completedTrips.length > 0) {
          const consecutiveDays = calculateConsecutiveDays(completedTrips);
          if (consecutiveDays >= criteria.streakDays && !hasEarned) {
            isEligible = true;
          }
        }
        break;

      case "peak":
        if (criteria.peakHours) {
          const peakTrips = completedTrips.filter(t => {
            if (!t.completedAt) return false;
            const hour = new Date(t.completedAt).getHours();
            return hour >= criteria.peakHours!.start && hour <= criteria.peakHours!.end;
          });
          if (peakTrips.length > 0 && !hasEarned) {
            isEligible = true;
          }
        }
        break;

      case "quality":
        if (criteria.minRating && averageRating >= criteria.minRating && !hasEarned) {
          isEligible = true;
        }
        break;

      case "promo":
        if (!hasEarned) {
          isEligible = true;
        }
        break;
    }

    if (isEligible) {
      eligiblePrograms.push(program);
      
      const earning = await storage.createIncentiveEarning({
        programId: program.id,
        driverId,
        amount: program.rewardAmount,
        status: "pending"
      });
      earnedIncentives.push(earning);
      
      await storage.createAuditLog({
        action: "incentive_earned",
        entityType: "incentive_earning",
        entityId: earning.id,
        performedByUserId: "system",
        performedByRole: "system",
        metadata: JSON.stringify({ programId: program.id, driverId, amount: program.rewardAmount })
      });
    }
  }

  return {
    eligible: eligiblePrograms,
    earned: earnedIncentives,
    blocked: false,
    antiFraudFlags: []
  };
}

function calculateConsecutiveDays(trips: any[]): number {
  if (trips.length === 0) return 0;
  
  const completedDates = trips
    .filter(t => t.completedAt)
    .map(t => new Date(t.completedAt).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (completedDates.length === 0) return 0;

  let streak = 1;
  let maxStreak = 1;
  
  for (let i = 1; i < completedDates.length; i++) {
    const current = new Date(completedDates[i]);
    const previous = new Date(completedDates[i - 1]);
    const diffDays = Math.abs((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }

  return maxStreak;
}

export async function approveAndPayIncentive(
  earningId: string,
  approvedByUserId: string
): Promise<{ success: boolean; error?: string }> {
  const earning = await storage.getIncentiveEarningById(earningId);
  if (!earning) {
    return { success: false, error: "Earning not found" };
  }

  if (earning.status !== "pending" && earning.status !== "approved") {
    return { success: false, error: `Cannot pay earning with status: ${earning.status}` };
  }

  const riskProfile = await storage.getRiskProfile(earning.driverId);
  if (riskProfile && (riskProfile.level === "high" || riskProfile.level === "critical")) {
    return { success: false, error: "Driver has high/critical risk - payment blocked" };
  }

  const wallet = await storage.getOrCreateWallet(earning.driverId, "driver");
  
  const transaction = await storage.creditWallet(
    wallet.id,
    earning.amount,
    "incentive",
    earning.id,
    approvedByUserId,
    `Incentive reward for program ${earning.programId}`
  );

  await storage.payIncentiveEarning(earningId, transaction.id);

  await storage.createAuditLog({
    action: "incentive_paid",
    entityType: "incentive_earning",
    entityId: earningId,
    performedByUserId: approvedByUserId,
    performedByRole: "admin",
    metadata: JSON.stringify({ amount: earning.amount, walletTransactionId: transaction.id })
  });

  await storage.createNotification({
    userId: earning.driverId,
    role: "driver",
    title: "Incentive Bonus Received",
    message: `You received a $${earning.amount} incentive bonus!`,
    type: "success"
  });

  return { success: true };
}

export async function revokeIncentive(
  earningId: string,
  revokedByUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const earning = await storage.getIncentiveEarningById(earningId);
  if (!earning) {
    return { success: false, error: "Earning not found" };
  }

  if (earning.status === "revoked") {
    return { success: false, error: "Earning already revoked" };
  }

  if (earning.status === "paid") {
    const wallet = await storage.getWalletByUserId(earning.driverId);
    if (wallet) {
      await storage.debitWallet(
        wallet.id,
        earning.amount,
        "incentive",
        earning.id,
        revokedByUserId,
        `Incentive revoked: ${reason}`
      );
    }
  }

  await storage.revokeIncentiveEarning(earningId, revokedByUserId, reason);

  await storage.createAuditLog({
    action: "incentive_revoked",
    entityType: "incentive_earning",
    entityId: earningId,
    performedByUserId: revokedByUserId,
    performedByRole: "admin",
    metadata: JSON.stringify({ reason, previousStatus: earning.status })
  });

  await storage.createNotification({
    userId: earning.driverId,
    role: "driver",
    title: "Incentive Revoked",
    message: `An incentive of $${earning.amount} has been revoked. Reason: ${reason}`,
    type: "warning"
  });

  return { success: true };
}

export async function evaluateAllDrivers(): Promise<{
  evaluated: number;
  newEarnings: number;
  blocked: number;
}> {
  const drivers = await storage.getAllDrivers();
  let evaluated = 0;
  let newEarnings = 0;
  let blocked = 0;

  for (const driver of drivers) {
    if (driver.status !== "approved") continue;
    
    const result = await evaluateDriverForIncentives(driver.userId);
    evaluated++;
    
    if (result.blocked) {
      blocked++;
    } else {
      newEarnings += result.earned.length;
    }
  }

  return { evaluated, newEarnings, blocked };
}

export async function evaluateBehaviorAndWarnings(
  userId: string,
  role: string
): Promise<UserBehaviorStats> {
  const stats = await storage.getOrCreateBehaviorStats(userId, role);

  const acceptanceRate = stats.totalTripsOffered > 0
    ? stats.totalTripsAccepted / stats.totalTripsOffered
    : 0;

  const denominator = stats.totalTripsCompleted + stats.cancelledByUser;
  const cancellationRate = denominator > 0
    ? stats.cancelledByUser / denominator
    : 0;

  let warningLevel: "none" | "caution" | "warning" | "restricted" = "none";
  let matchingPriority = "100";
  let incentiveEligible = true;
  let promoEligible = true;
  let warningsIssued = stats.warningsIssued;

  if (role === "driver") {
    if (cancellationRate > 0.40) {
      warningLevel = "restricted";
      matchingPriority = "40";
      incentiveEligible = false;
      warningsIssued++;
    } else if (cancellationRate > 0.25) {
      warningLevel = "warning";
      matchingPriority = "70";
      incentiveEligible = false;
      warningsIssued++;
    } else if (cancellationRate > 0.15) {
      warningLevel = "caution";
      matchingPriority = "100";
      warningsIssued++;
    } else if (acceptanceRate > 0.80 && cancellationRate < 0.10) {
      warningLevel = "none";
      matchingPriority = "120";
      incentiveEligible = true;
    }
  } else if (role === "rider") {
    if (cancellationRate > 0.50) {
      warningLevel = "restricted";
      matchingPriority = "40";
      promoEligible = false;
      warningsIssued++;
    } else if (cancellationRate > 0.30) {
      warningLevel = "warning";
      matchingPriority = "70";
      promoEligible = false;
      warningsIssued++;
    } else if (cancellationRate > 0.20) {
      warningLevel = "caution";
      promoEligible = false;
      warningsIssued++;
    }
  }

  const updated = await storage.updateBehaviorStats(userId, {
    warningLevel,
    matchingPriority,
    incentiveEligible,
    promoEligible,
    warningsIssued,
    lastWarningAt: warningLevel !== "none" ? new Date() : stats.lastWarningAt,
    lastEvaluatedAt: new Date(),
  });

  return updated || stats;
}

export async function calculateDriverMatchingScore(
  driverId: string,
  riderLocation?: { lat: number; lng: number }
): Promise<DriverMatchingScore> {
  const [behaviorStats, trustProfile, driverProfile] = await Promise.all([
    storage.getBehaviorStats(driverId),
    storage.getUserTrustProfile(driverId),
    storage.getDriverProfile(driverId),
  ]);

  let proximityScore = 15;
  if (riderLocation && driverProfile) {
    const driverLat = (driverProfile as any).currentLat ? parseFloat(String((driverProfile as any).currentLat)) : null;
    const driverLng = (driverProfile as any).currentLng ? parseFloat(String((driverProfile as any).currentLng)) : null;

    if (driverLat && driverLng) {
      const distance = haversineDistance(
        riderLocation.lat, riderLocation.lng,
        driverLat, driverLng
      );
      if (distance <= 1) {
        proximityScore = 30;
      } else if (distance <= 3) {
        proximityScore = 25;
      } else if (distance <= 5) {
        proximityScore = 20;
      } else if (distance <= 10) {
        proximityScore = 15;
      } else if (distance <= 20) {
        proximityScore = 10;
      } else {
        proximityScore = 5;
      }
    }
  }

  let acceptanceScore = 10;
  if (behaviorStats && behaviorStats.totalTripsOffered > 0) {
    const acceptanceRate = behaviorStats.totalTripsAccepted / behaviorStats.totalTripsOffered;
    acceptanceScore = Math.round(acceptanceRate * 20);
  }

  let cancellationScore = 20;
  if (behaviorStats) {
    const denom = behaviorStats.totalTripsCompleted + behaviorStats.cancelledByUser;
    if (denom > 0) {
      const cancellationRate = behaviorStats.cancelledByUser / denom;
      cancellationScore = Math.round((1 - cancellationRate) * 20);
    }
  }

  let ratingScore = 10;
  if (driverProfile?.averageRating) {
    const rating = parseFloat(driverProfile.averageRating);
    ratingScore = Math.round((rating / 5) * 20);
  }

  let onlineDurationScore = 5;
  if (trustProfile) {
    const trustScore = trustProfile.trustScore ? parseFloat(String(trustProfile.trustScore)) : 50;
    onlineDurationScore = Math.round((trustScore / 100) * 10);
  }

  const totalScore = Math.min(100, Math.max(0,
    proximityScore + acceptanceScore + cancellationScore + ratingScore + onlineDurationScore
  ));

  return {
    driverId,
    proximityScore,
    acceptanceScore,
    cancellationScore,
    ratingScore,
    onlineDurationScore,
    totalScore,
  };
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getDriverIncentiveProgress(driverId: string): Promise<IncentiveProgress[]> {
  const activePrograms = await storage.getActiveIncentivePrograms();
  const driverTrips = await storage.getDriverTripHistory(driverId, {});
  const completedTrips = driverTrips.filter(t => t.status === "completed");
  const driverProfile = await storage.getDriverProfile(driverId);
  const averageRating = driverProfile?.averageRating ? parseFloat(driverProfile.averageRating) : 0;

  const riskProfile = await storage.getRiskProfile(driverId);
  const isBlocked = riskProfile && (riskProfile.level === "high" || riskProfile.level === "critical");

  const progressList: IncentiveProgress[] = [];

  for (const program of activePrograms) {
    const criteria = parseCriteria(program.criteria);
    const existingEarnings = await storage.getDriverEarningsByProgram(driverId, program.id);
    const hasEarned = existingEarnings.some(e => e.status === "pending" || e.status === "approved" || e.status === "paid");

    let targetValue = 0;
    let currentValue = 0;

    switch (program.type) {
      case "trip":
        targetValue = criteria.tripCount || 10;
        currentValue = completedTrips.length;
        break;
      case "streak":
        targetValue = criteria.streakDays || 7;
        currentValue = calculateConsecutiveDays(completedTrips);
        break;
      case "peak":
        if (criteria.peakHours) {
          targetValue = 1;
          const peakTrips = completedTrips.filter(t => {
            if (!t.completedAt) return false;
            const hour = new Date(t.completedAt).getHours();
            return hour >= criteria.peakHours!.start && hour <= criteria.peakHours!.end;
          });
          currentValue = peakTrips.length > 0 ? 1 : 0;
        }
        break;
      case "quality":
        targetValue = criteria.minRating || 4.5;
        currentValue = averageRating;
        break;
      case "promo":
        targetValue = 1;
        currentValue = hasEarned ? 1 : 0;
        break;
    }

    const progressPercent = targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0;

    let status: "in_progress" | "eligible" | "earned" | "blocked" = "in_progress";
    let blockReason: string | undefined;

    if (isBlocked) {
      status = "blocked";
      blockReason = "High risk profile";
    } else if (hasEarned) {
      status = "earned";
    } else if (progressPercent >= 100) {
      status = "eligible";
    }

    progressList.push({
      programId: program.id,
      programName: program.name,
      type: program.type,
      targetValue,
      currentValue,
      progressPercent,
      rewardAmount: program.rewardAmount,
      currency: program.currency || "USD",
      expiresAt: program.endAt ? new Date(program.endAt).toISOString() : "",
      status,
      blockReason,
    });
  }

  return progressList;
}

export async function assignFirstRidePromo(
  riderId: string,
  currency: string = "USD"
): Promise<{ success: boolean; promoId?: string; error?: string }> {
  const existing = await storage.getRiderPromoByCode("FIRSTRIDE", riderId);
  if (existing) {
    return { success: false, error: "Rider already has a FIRSTRIDE promo" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const promo = await storage.createRiderPromo({
    code: "FIRSTRIDE",
    riderId,
    type: "first_ride",
    discountPercent: "20.00",
    discountAmount: "0",
    currency,
    maxUses: 1,
    expiresAt,
  });

  await storage.createAuditLog({
    action: "promo_assigned",
    entityType: "rider_promo",
    entityId: promo.id,
    performedByUserId: "system",
    performedByRole: "system",
    metadata: JSON.stringify({ riderId, code: "FIRSTRIDE", discountPercent: 20 }),
  });

  return { success: true, promoId: promo.id };
}

export async function assignReturnRiderPromo(
  riderId: string,
  currency: string = "USD"
): Promise<{ success: boolean; promoId?: string; error?: string }> {
  const existing = await storage.getRiderPromoByCode("COMEBACK", riderId);
  if (existing && existing.status === "active") {
    return { success: false, error: "Rider already has an active COMEBACK promo" };
  }

  let isInactive = false;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const analytics = await storage.getOrCreateUserAnalytics(riderId, "rider");
    if (analytics.lastActiveAt && new Date(analytics.lastActiveAt) < thirtyDaysAgo) {
      isInactive = true;
    } else if (!analytics.lastActiveAt && analytics.firstSessionAt && new Date(analytics.firstSessionAt) < thirtyDaysAgo) {
      isInactive = true;
    }
  } catch {
    const trips = await storage.getRiderTripHistory(riderId);
    if (trips.length === 0) {
      isInactive = true;
    } else {
      const lastTrip = trips.sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];
      if (lastTrip.createdAt && new Date(lastTrip.createdAt) < thirtyDaysAgo) {
        isInactive = true;
      }
    }
  }

  if (!isInactive) {
    return { success: false, error: "Rider is not inactive for 30+ days" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const promo = await storage.createRiderPromo({
    code: "COMEBACK",
    riderId,
    type: "return_rider",
    discountPercent: "15.00",
    discountAmount: "0",
    currency,
    maxUses: 1,
    expiresAt,
  });

  await storage.createAuditLog({
    action: "promo_assigned",
    entityType: "rider_promo",
    entityId: promo.id,
    performedByUserId: "system",
    performedByRole: "system",
    metadata: JSON.stringify({ riderId, code: "COMEBACK", discountPercent: 15 }),
  });

  return { success: true, promoId: promo.id };
}

export async function applyPromoToTrip(
  riderId: string,
  promoCode: string,
  tripId: string
): Promise<{ success: boolean; discountPercent?: number; discountAmount?: number; error?: string }> {
  const promo = await storage.getRiderPromoByCode(promoCode, riderId);
  if (!promo) {
    return { success: false, error: "Promo code not found" };
  }

  if (promo.status !== "active") {
    return { success: false, error: `Promo is ${promo.status}` };
  }

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { success: false, error: "Promo has expired" };
  }

  if (promo.usedCount >= promo.maxUses) {
    return { success: false, error: "Promo has reached maximum uses" };
  }

  const activePromos = await storage.getActiveRiderPromos(riderId);
  const promoAlreadyOnTrip = activePromos.find(p => p.tripId === tripId && p.id !== promo.id);
  if (promoAlreadyOnTrip) {
    return { success: false, error: "Only 1 promo can be applied per trip (no stacking)" };
  }

  const used = await storage.useRiderPromo(promo.id, tripId);
  if (!used) {
    return { success: false, error: "Failed to apply promo" };
  }

  await storage.createAuditLog({
    action: "promo_applied",
    entityType: "rider_promo",
    entityId: promo.id,
    performedByUserId: riderId,
    performedByRole: "rider",
    metadata: JSON.stringify({ tripId, promoCode, discountPercent: promo.discountPercent }),
  });

  return {
    success: true,
    discountPercent: parseFloat(promo.discountPercent),
    discountAmount: parseFloat(promo.discountAmount),
  };
}

export async function voidPromosOnCancellation(
  riderId: string,
  tripId: string
): Promise<{ voided: number }> {
  const promos = await storage.getRiderPromosByRider(riderId);
  let voided = 0;

  for (const promo of promos) {
    if (promo.tripId === tripId && (promo.status === "used" || promo.status === "active")) {
      await storage.voidRiderPromo(promo.id);
      voided++;

      await storage.createAuditLog({
        action: "promo_voided",
        entityType: "rider_promo",
        entityId: promo.id,
        performedByUserId: "system",
        performedByRole: "system",
        metadata: JSON.stringify({ riderId, tripId, reason: "trip_cancelled" }),
      });
    }
  }

  return { voided };
}

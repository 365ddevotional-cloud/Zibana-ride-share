import { storage } from "./storage";
import type { IncentiveProgram, IncentiveEarning } from "@shared/schema";

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

export async function evaluateDriverForIncentives(driverId: string): Promise<{
  eligible: IncentiveProgram[];
  earned: IncentiveEarning[];
  blocked: boolean;
  blockReason?: string;
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

  const activePrograms = await storage.getActiveIncentivePrograms();
  const eligiblePrograms: IncentiveProgram[] = [];
  const earnedIncentives: IncentiveEarning[] = [];

  const driverTrips = await storage.getDriverTripHistory(driverId, {});
  const completedTrips = driverTrips.filter(t => t.status === "completed");
  const driverProfile = await storage.getDriverProfile(driverId);
  const averageRating = driverProfile?.averageRating ? parseFloat(driverProfile.averageRating) : 0;

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
    blocked: false
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

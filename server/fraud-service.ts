/**
 * Fraud & Abuse Detection Service
 * LOW-COST, RULE-BASED FRAUD PROTECTION
 * All flags are logged for admin review
 */

import { db } from "./db";
import { abuseFlags, rides, riderProfiles, driverProfiles, driverMovements, financialAuditLogs } from "@shared/schema";
import { eq, and, gte, count, sql } from "drizzle-orm";

export type AbuseType = 
  | "excessive_cancellations" 
  | "late_cancellations" 
  | "reservation_abuse"
  | "fake_movement" 
  | "excessive_idle" 
  | "unjustified_cancellations"
  | "repeated_no_shows" 
  | "cancel_after_driver_moving";

export interface AbuseCheckResult {
  flagged: boolean;
  abuseType?: AbuseType;
  severity?: "low" | "medium" | "high";
  description?: string;
  penaltyMultiplier?: number;
}

const THRESHOLDS = {
  EXCESSIVE_CANCELLATIONS_24H: 3,
  LATE_CANCELLATIONS_WEEK: 2,
  RESERVATION_ABUSE_WEEK: 2,
  DRIVER_IDLE_MINUTES: 10,
  FAKE_MOVEMENT_DISTANCE_KM: 0.05,
  NO_SHOW_MONTH: 3,
};

export const fraudService = {
  async checkRiderAbuse(riderId: string, rideId?: string): Promise<AbuseCheckResult> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentCancellations = await db
      .select({ count: count() })
      .from(rides)
      .where(
        and(
          eq(rides.riderId, riderId),
          eq(rides.cancelledBy, "rider"),
          gte(rides.cancelledAt, twentyFourHoursAgo)
        )
      );
    
    const cancellationCount = recentCancellations[0]?.count || 0;
    
    if (cancellationCount >= THRESHOLDS.EXCESSIVE_CANCELLATIONS_24H) {
      await this.createAbuseFlag({
        userId: riderId,
        userRole: "rider",
        abuseType: "excessive_cancellations",
        severity: cancellationCount >= 5 ? "high" : "medium",
        description: `${cancellationCount} cancellations in the last 24 hours`,
        relatedRideId: rideId,
      });
      
      return {
        flagged: true,
        abuseType: "excessive_cancellations",
        severity: cancellationCount >= 5 ? "high" : "medium",
        description: `Excessive cancellations detected: ${cancellationCount} in 24h`,
        penaltyMultiplier: 1.5,
      };
    }
    
    const lateCancellations = await db
      .select({ count: count() })
      .from(rides)
      .where(
        and(
          eq(rides.riderId, riderId),
          eq(rides.cancelledBy, "rider"),
          gte(rides.cancelledAt, oneWeekAgo),
          sql`${rides.cancelledAt} > ${rides.acceptedAt} + interval '2 minutes'`
        )
      );
    
    const lateCount = lateCancellations[0]?.count || 0;
    
    if (lateCount >= THRESHOLDS.LATE_CANCELLATIONS_WEEK) {
      await this.createAbuseFlag({
        userId: riderId,
        userRole: "rider",
        abuseType: "late_cancellations",
        severity: "medium",
        description: `${lateCount} late cancellations in the last week`,
        relatedRideId: rideId,
      });
      
      return {
        flagged: true,
        abuseType: "late_cancellations",
        severity: "medium",
        description: `Late cancellation pattern detected: ${lateCount} this week`,
        penaltyMultiplier: 1.25,
      };
    }
    
    return { flagged: false };
  },
  
  async checkDriverAbuse(driverId: string, rideId?: string): Promise<AbuseCheckResult> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const unjustifiedCancellations = await db
      .select({ count: count() })
      .from(rides)
      .where(
        and(
          eq(rides.driverId, driverId),
          eq(rides.cancelledBy, "driver"),
          gte(rides.cancelledAt, oneWeekAgo)
        )
      );
    
    const cancelCount = unjustifiedCancellations[0]?.count || 0;
    
    if (cancelCount >= THRESHOLDS.EXCESSIVE_CANCELLATIONS_24H) {
      await this.createAbuseFlag({
        userId: driverId,
        userRole: "driver",
        abuseType: "unjustified_cancellations",
        severity: cancelCount >= 5 ? "high" : "medium",
        description: `${cancelCount} cancellations in the last week`,
        relatedRideId: rideId,
      });
      
      return {
        flagged: true,
        abuseType: "unjustified_cancellations",
        severity: cancelCount >= 5 ? "high" : "medium",
        description: `High cancellation rate: ${cancelCount} this week`,
      };
    }
    
    return { flagged: false };
  },
  
  async checkFakeMovement(driverId: string, rideId: string): Promise<AbuseCheckResult> {
    const movements = await db
      .select()
      .from(driverMovements)
      .where(
        and(
          eq(driverMovements.driverId, driverId),
          eq(driverMovements.rideId, rideId)
        )
      )
      .orderBy(driverMovements.recordedAt);
    
    if (movements.length < 5) {
      return { flagged: false };
    }
    
    let suspiciousCount = 0;
    for (let i = 1; i < movements.length; i++) {
      const distanceKm = parseFloat(movements[i].distanceKm || "0");
      const durationSec = movements[i].durationSec || 0;
      
      if (durationSec > 60 && distanceKm < THRESHOLDS.FAKE_MOVEMENT_DISTANCE_KM) {
        suspiciousCount++;
      }
    }
    
    if (suspiciousCount >= movements.length * 0.5) {
      await this.createAbuseFlag({
        userId: driverId,
        userRole: "driver",
        abuseType: "fake_movement",
        severity: "high",
        description: `Suspicious movement pattern detected - possible GPS manipulation`,
        relatedRideId: rideId,
      });
      
      return {
        flagged: true,
        abuseType: "fake_movement",
        severity: "high",
        description: "Suspicious movement pattern detected",
      };
    }
    
    return { flagged: false };
  },
  
  async checkReservationAbuse(riderId: string, rideId?: string): Promise<AbuseCheckResult> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const reservationCancels = await db
      .select({ count: count() })
      .from(rides)
      .where(
        and(
          eq(rides.riderId, riderId),
          eq(rides.isReserved, true),
          eq(rides.cancelledBy, "rider"),
          gte(rides.cancelledAt, oneWeekAgo)
        )
      );
    
    const cancelCount = reservationCancels[0]?.count || 0;
    
    if (cancelCount >= THRESHOLDS.RESERVATION_ABUSE_WEEK) {
      await this.createAbuseFlag({
        userId: riderId,
        userRole: "rider",
        abuseType: "reservation_abuse",
        severity: "high",
        description: `${cancelCount} reservation cancellations this week`,
        relatedRideId: rideId,
      });
      
      return {
        flagged: true,
        abuseType: "reservation_abuse",
        severity: "high",
        description: `Reservation abuse detected: ${cancelCount} cancelled reservations`,
        penaltyMultiplier: 2.0,
      };
    }
    
    return { flagged: false };
  },
  
  async checkCancelAfterDriverMoving(
    riderId: string,
    rideId: string,
    driverEnRouteAt?: Date
  ): Promise<AbuseCheckResult> {
    if (!driverEnRouteAt) {
      return { flagged: false };
    }
    
    const movements = await db
      .select()
      .from(driverMovements)
      .where(eq(driverMovements.rideId, rideId));
    
    const totalDistance = movements.reduce((sum, m) => sum + parseFloat(m.distanceKm || "0"), 0);
    
    if (totalDistance > 0.5) {
      await this.createAbuseFlag({
        userId: riderId,
        userRole: "rider",
        abuseType: "cancel_after_driver_moving",
        severity: "high",
        description: `Rider cancelled after driver traveled ${totalDistance.toFixed(2)} km`,
        relatedRideId: rideId,
      });
      
      return {
        flagged: true,
        abuseType: "cancel_after_driver_moving",
        severity: "high",
        description: `Cancelled after driver started moving (${totalDistance.toFixed(2)} km)`,
        penaltyMultiplier: 2.5,
      };
    }
    
    return { flagged: false };
  },
  
  async createAbuseFlag(data: {
    userId: string;
    userRole: string;
    abuseType: AbuseType;
    severity: "low" | "medium" | "high";
    description: string;
    relatedRideId?: string;
  }): Promise<void> {
    await db.insert(abuseFlags).values({
      userId: data.userId,
      userRole: data.userRole,
      abuseType: data.abuseType,
      severity: data.severity,
      description: data.description,
      relatedRideId: data.relatedRideId,
    });
    
    console.log(`[FRAUD] Flag created: ${data.abuseType} for ${data.userRole} ${data.userId}`);
  },
  
  async getPendingFlags(limit = 50) {
    return db
      .select()
      .from(abuseFlags)
      .where(eq(abuseFlags.status, "pending"))
      .orderBy(sql`${abuseFlags.createdAt} DESC`)
      .limit(limit);
  },
  
  async resolveFlag(
    flagId: string,
    reviewedByUserId: string,
    status: "resolved" | "dismissed",
    reviewNotes?: string,
    penaltyApplied?: number
  ): Promise<{ success: boolean }> {
    await db
      .update(abuseFlags)
      .set({
        status,
        reviewedByUserId,
        reviewNotes,
        penaltyApplied: penaltyApplied?.toString(),
        resolvedAt: new Date(),
      })
      .where(eq(abuseFlags.id, flagId));
    
    return { success: true };
  },
  
  async calculateCancellationFee(
    baseFee: number,
    riderId: string,
    rideId: string,
    isReserved: boolean,
    driverEnRouteAt?: Date
  ): Promise<{ fee: number; penaltyApplied: boolean; reason?: string }> {
    let fee = baseFee;
    let penaltyApplied = false;
    let reason: string | undefined;
    
    const abuseCheck = await this.checkRiderAbuse(riderId, rideId);
    if (abuseCheck.flagged && abuseCheck.penaltyMultiplier) {
      fee *= abuseCheck.penaltyMultiplier;
      penaltyApplied = true;
      reason = abuseCheck.description;
    }
    
    if (isReserved) {
      const reservationCheck = await this.checkReservationAbuse(riderId, rideId);
      if (reservationCheck.flagged && reservationCheck.penaltyMultiplier) {
        fee *= reservationCheck.penaltyMultiplier;
        penaltyApplied = true;
        reason = reservationCheck.description;
      }
    }
    
    if (driverEnRouteAt) {
      const movingCheck = await this.checkCancelAfterDriverMoving(riderId, rideId, driverEnRouteAt);
      if (movingCheck.flagged && movingCheck.penaltyMultiplier) {
        fee *= movingCheck.penaltyMultiplier;
        penaltyApplied = true;
        reason = movingCheck.description;
      }
    }
    
    return { fee: Math.round(fee * 100) / 100, penaltyApplied, reason };
  },
  
  async denyDriverCompensation(driverId: string, rideId: string, reason: string): Promise<void> {
    await db.insert(financialAuditLogs).values({
      rideId,
      userId: driverId,
      actorRole: "SYSTEM",
      eventType: "ADJUSTMENT",
      amount: "0.00",
      description: `Driver compensation denied: ${reason}`,
    });
    
    console.log(`[FRAUD] Compensation denied for driver ${driverId}: ${reason}`);
  },
};

// =============================================
// PHASE 5: DISPUTES, REFUNDS & LEGAL RESOLUTION GUARDS
// =============================================

import { storage } from "./storage";
import {
  DISPUTE_ENGINE_LOCKED,
  assertDisputeEngineLocked,
  DISPUTE_CONFIG,
  getDisputeWindowHours,
  isWithinDisputeWindow,
  hasExceededDisputeThreshold,
  hasExceededChargebackThreshold,
  shouldLockAccountForChargebacks,
  type DisputeType,
  type InitiatorRole,
  type RefundType,
} from "@shared/dispute-config";
import type {
  Phase5Dispute,
  Phase5RefundOutcome,
  ChargebackFlag,
  DisputeAuditLog,
  Trip,
} from "@shared/schema";

// Re-export engine lock for external checks
export { DISPUTE_ENGINE_LOCKED, assertDisputeEngineLocked };

// =============================================
// DISPUTE ELIGIBILITY GUARDS
// =============================================

export interface DisputeEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export async function checkDisputeEligibility(
  tripId: string,
  initiatorUserId: string,
  initiatorRole: InitiatorRole
): Promise<DisputeEligibilityResult> {
  assertDisputeEngineLocked();

  const trip = await storage.getTripById(tripId);
  if (!trip) {
    return { eligible: false, reason: "Trip not found" };
  }

  if (trip.status !== "completed") {
    return { eligible: false, reason: "Disputes can only be filed for completed trips" };
  }

  if (!trip.completedAt) {
    return { eligible: false, reason: "Trip completion time not recorded" };
  }

  const countryCode = trip.countryCode || undefined;
  if (!isWithinDisputeWindow(new Date(trip.completedAt), countryCode)) {
    const windowHours = getDisputeWindowHours(countryCode);
    return { 
      eligible: false, 
      reason: `Dispute window has expired (${windowHours} hours after trip completion)` 
    };
  }

  const existingDispute = await storage.getExistingDisputeForTripAndRole(tripId, initiatorRole);
  if (existingDispute) {
    return { eligible: false, reason: "A dispute has already been filed for this trip by your role" };
  }

  const isValidInitiator = 
    (initiatorRole === "RIDER" && trip.riderId === initiatorUserId) ||
    (initiatorRole === "DRIVER" && trip.driverId === initiatorUserId);

  if (!isValidInitiator) {
    return { eligible: false, reason: "You are not authorized to file a dispute for this trip" };
  }

  const isLocked = await storage.isUserLockedForChargebacks(initiatorUserId);
  if (isLocked) {
    return { eligible: false, reason: "Your account is locked due to payment disputes" };
  }

  return { eligible: true };
}

// =============================================
// DISPUTE CREATION
// =============================================

export interface CreateDisputeResult {
  success: boolean;
  disputeId?: string;
  autoFlagged?: boolean;
  error?: string;
}

export async function createDispute(
  tripId: string,
  initiatorUserId: string,
  initiatorRole: InitiatorRole,
  accusedUserId: string,
  disputeType: DisputeType,
  description: string,
  evidenceMetadata?: string
): Promise<CreateDisputeResult> {
  assertDisputeEngineLocked();

  const eligibility = await checkDisputeEligibility(tripId, initiatorUserId, initiatorRole);
  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason };
  }

  if (description.length < DISPUTE_CONFIG.MIN_DESCRIPTION_LENGTH) {
    return { 
      success: false, 
      error: `Description must be at least ${DISPUTE_CONFIG.MIN_DESCRIPTION_LENGTH} characters` 
    };
  }

  if (initiatorUserId === accusedUserId) {
    return { success: false, error: "Cannot file a dispute against yourself" };
  }

  const trip = await storage.getTripById(tripId);
  if (!trip) {
    return { success: false, error: "Trip not found" };
  }

  const isAccusedInTrip = trip.riderId === accusedUserId || trip.driverId === accusedUserId;
  if (!isAccusedInTrip) {
    return { success: false, error: "Accused user was not part of this trip" };
  }

  try {
    const dispute = await storage.createPhase5Dispute({
      tripId,
      initiatorRole,
      initiatorUserId,
      accusedUserId,
      disputeType,
      description,
      evidenceMetadata: evidenceMetadata || null,
      countryCode: trip.countryCode || null,
      currencyCode: trip.currencyCode || null,
      originalFare: trip.fareAmount || null,
      status: "OPEN",
    });

    await storage.createDisputeAuditLog({
      disputeId: dispute.id,
      userId: initiatorUserId,
      actionType: "DISPUTE_CREATED",
      actionBy: initiatorUserId,
      actionByRole: initiatorRole,
      metadata: JSON.stringify({
        tripId,
        disputeType,
        accusedUserId,
      }),
    });

    const disputeCount = await storage.countUserDisputesInPeriod(initiatorUserId, 30);
    let autoFlagged = false;
    if (hasExceededDisputeThreshold(disputeCount)) {
      autoFlagged = true;
      await storage.createDisputeAuditLog({
        disputeId: dispute.id,
        userId: initiatorUserId,
        actionType: "ACCOUNT_FLAGGED",
        actionBy: "SYSTEM",
        justification: `User exceeded dispute threshold: ${disputeCount} disputes in 30 days`,
      });
    }

    return {
      success: true,
      disputeId: dispute.id,
      autoFlagged,
    };
  } catch (error) {
    console.error("Error creating dispute:", error);
    return { success: false, error: "Failed to create dispute" };
  }
}

// =============================================
// REFUND ENGINE
// =============================================

export interface RefundResult {
  success: boolean;
  refundId?: string;
  platformAbsorbed?: boolean;
  error?: string;
}

export async function initiateRefund(
  disputeId: string,
  refundType: RefundType,
  refundAmount: string | null,
  reason: string,
  adminId: string
): Promise<RefundResult> {
  assertDisputeEngineLocked();

  try {
    const dispute = await storage.getPhase5Dispute(disputeId);
    if (!dispute) {
      return { success: false, error: "Dispute not found" };
    }

    const trip = await storage.getTripById(dispute.tripId);
    if (!trip) {
      return { success: false, error: "Associated trip not found" };
    }

    if (refundType === "NO_REFUND") {
      await storage.createDisputeAuditLog({
        disputeId,
        userId: dispute.initiatorUserId,
        actionType: "REFUND_REJECTED",
        actionBy: adminId,
        actionByRole: "admin",
        decision: "NO_REFUND",
        justification: reason,
      });
      return { success: true };
    }

    let driverPayoutSettled = false;
    let platformAbsorbed = false;

    if (trip.driverId) {
      const driverWallet = await storage.getDriverWallet(trip.driverId);
      if (driverWallet) {
        const driverBalance = parseFloat(driverWallet.balance || "0");
        const driverPayout = parseFloat(trip.driverPayout || "0");
        
        if (driverBalance < driverPayout) {
          driverPayoutSettled = true;
          platformAbsorbed = true;
        }
      }
    }

    const refundOutcome = await storage.createPhase5RefundOutcome({
      disputeId,
      tripId: dispute.tripId,
      riderId: trip.riderId,
      driverId: trip.driverId || null,
      refundType,
      refundAmount: refundAmount || null,
      originalPaymentSource: trip.paymentSource as any || null,
      currencyCode: trip.currencyCode || "NGN",
      status: "PENDING",
      driverPayoutSettled,
      platformAbsorbed,
      reason,
    });

    await storage.createDisputeAuditLog({
      disputeId,
      refundId: refundOutcome.id,
      userId: dispute.initiatorUserId,
      actionType: "REFUND_INITIATED",
      actionBy: adminId,
      actionByRole: "admin",
      decision: refundType,
      justification: reason,
      metadata: JSON.stringify({
        refundAmount,
        platformAbsorbed,
        driverPayoutSettled,
      }),
    });

    return {
      success: true,
      refundId: refundOutcome.id,
      platformAbsorbed,
    };
  } catch (error) {
    console.error("Error initiating refund:", error);
    return { success: false, error: "Failed to initiate refund" };
  }
}

export async function processRefund(
  refundId: string,
  processedBy: string
): Promise<RefundResult> {
  assertDisputeEngineLocked();

  try {
    const refund = await storage.getPhase5RefundOutcome(refundId);
    if (!refund) {
      return { success: false, error: "Refund not found" };
    }

    if (refund.status !== "APPROVED") {
      return { success: false, error: "Refund must be approved before processing" };
    }

    await storage.updatePhase5RefundStatus(refundId, "PROCESSED", processedBy);

    await storage.createDisputeAuditLog({
      disputeId: refund.disputeId,
      refundId,
      actionType: "REFUND_PROCESSED",
      actionBy: processedBy,
      actionByRole: "admin",
      metadata: JSON.stringify({
        amount: refund.refundAmount,
        currencyCode: refund.currencyCode,
      }),
    });

    return { success: true, refundId };
  } catch (error) {
    console.error("Error processing refund:", error);
    return { success: false, error: "Failed to process refund" };
  }
}

// =============================================
// ADMIN DISPUTE ACTIONS
// =============================================

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

export async function adminReviewDispute(
  disputeId: string,
  adminId: string
): Promise<AdminActionResult> {
  assertDisputeEngineLocked();

  try {
    const dispute = await storage.getPhase5Dispute(disputeId);
    if (!dispute) {
      return { success: false, error: "Dispute not found" };
    }

    await storage.assignPhase5DisputeToAdmin(disputeId, adminId);

    await storage.createDisputeAuditLog({
      disputeId,
      userId: dispute.accusedUserId,
      actionType: "DISPUTE_REVIEWED",
      actionBy: adminId,
      actionByRole: "admin",
      previousState: dispute.status,
      newState: "UNDER_REVIEW",
    });

    return { success: true };
  } catch (error) {
    console.error("Error reviewing dispute:", error);
    return { success: false, error: "Failed to review dispute" };
  }
}

export async function adminApproveDispute(
  disputeId: string,
  adminId: string,
  notes: string,
  refundType?: RefundType,
  refundAmount?: string
): Promise<AdminActionResult> {
  assertDisputeEngineLocked();

  try {
    const dispute = await storage.getPhase5Dispute(disputeId);
    if (!dispute) {
      return { success: false, error: "Dispute not found" };
    }

    await storage.updatePhase5DisputeStatus(disputeId, "RESOLVED", notes, adminId);

    await storage.createDisputeAuditLog({
      disputeId,
      userId: dispute.accusedUserId,
      actionType: "DISPUTE_APPROVED",
      actionBy: adminId,
      actionByRole: "admin",
      decision: "RESOLVED",
      justification: notes,
      previousState: dispute.status,
      newState: "RESOLVED",
    });

    if (refundType && refundType !== "NO_REFUND") {
      await initiateRefund(disputeId, refundType, refundAmount || null, notes, adminId);
    }

    try {
      const { captureBehaviorSignal } = await import("./trust-guards");
      await captureBehaviorSignal(
        dispute.tripId,
        dispute.accusedUserId,
        dispute.initiatorRole === "RIDER" ? "driver" : "rider",
        "DISPUTE_AGAINST",
        { resolved: true, disputeType: dispute.disputeType }
      );
    } catch (trustError) {
      console.error("Error updating trust score:", trustError);
    }

    return { success: true };
  } catch (error) {
    console.error("Error approving dispute:", error);
    return { success: false, error: "Failed to approve dispute" };
  }
}

export async function adminRejectDispute(
  disputeId: string,
  adminId: string,
  reason: string
): Promise<AdminActionResult> {
  assertDisputeEngineLocked();

  try {
    const dispute = await storage.getPhase5Dispute(disputeId);
    if (!dispute) {
      return { success: false, error: "Dispute not found" };
    }

    await storage.updatePhase5DisputeStatus(disputeId, "REJECTED", reason, adminId);

    await storage.createDisputeAuditLog({
      disputeId,
      userId: dispute.initiatorUserId,
      actionType: "DISPUTE_REJECTED",
      actionBy: adminId,
      actionByRole: "admin",
      decision: "REJECTED",
      justification: reason,
      previousState: dispute.status,
      newState: "REJECTED",
    });

    return { success: true };
  } catch (error) {
    console.error("Error rejecting dispute:", error);
    return { success: false, error: "Failed to reject dispute" };
  }
}

export async function adminEscalateDispute(
  disputeId: string,
  adminId: string,
  reason: string
): Promise<AdminActionResult> {
  assertDisputeEngineLocked();

  try {
    const dispute = await storage.getPhase5Dispute(disputeId);
    if (!dispute) {
      return { success: false, error: "Dispute not found" };
    }

    await storage.createDisputeAuditLog({
      disputeId,
      userId: dispute.accusedUserId,
      actionType: "DISPUTE_ESCALATED",
      actionBy: adminId,
      actionByRole: "admin",
      justification: reason,
    });

    try {
      const { reportIncident } = await import("./safety-guards");
      await reportIncident(
        dispute.tripId,
        dispute.initiatorUserId,
        dispute.initiatorRole as any,
        dispute.accusedUserId,
        "OTHER",
        "MEDIUM",
        `Escalated from dispute: ${dispute.description}`,
        undefined,
        dispute.countryCode || undefined
      );
    } catch (safetyError) {
      console.error("Error escalating to safety:", safetyError);
    }

    return { success: true };
  } catch (error) {
    console.error("Error escalating dispute:", error);
    return { success: false, error: "Failed to escalate dispute" };
  }
}

// =============================================
// CHARGEBACK HANDLING
// =============================================

export async function reportChargeback(
  userId: string,
  chargebackId: string,
  adminId: string
): Promise<AdminActionResult> {
  assertDisputeEngineLocked();

  try {
    const flag = await storage.incrementChargebackCount(userId);

    await storage.createDisputeAuditLog({
      chargebackId,
      userId,
      actionType: "CHARGEBACK_REPORTED",
      actionBy: adminId,
      actionByRole: "admin",
      metadata: JSON.stringify({ totalChargebacks: flag.chargebackCount }),
    });

    if (hasExceededChargebackThreshold(flag.chargebackCount)) {
      await storage.flagUserForChargebacks(userId);
      await storage.createDisputeAuditLog({
        userId,
        actionType: "ACCOUNT_FLAGGED",
        actionBy: "SYSTEM",
        justification: `User exceeded chargeback threshold: ${flag.chargebackCount} chargebacks`,
      });
    }

    if (shouldLockAccountForChargebacks(flag.chargebackCount)) {
      await storage.lockUserForChargebacks(
        userId, 
        `Account locked due to ${flag.chargebackCount} chargebacks`, 
        "SYSTEM"
      );
      await storage.createDisputeAuditLog({
        userId,
        actionType: "ACCOUNT_LOCKED",
        actionBy: "SYSTEM",
        justification: `Account locked due to excessive chargebacks`,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error reporting chargeback:", error);
    return { success: false, error: "Failed to report chargeback" };
  }
}

// =============================================
// ADMIN READ-ONLY VIEWS
// =============================================

export async function getDisputeQueue(): Promise<Phase5Dispute[]> {
  assertDisputeEngineLocked();
  return storage.getAllOpenPhase5Disputes();
}

export async function getDisputeAuditLogs(): Promise<DisputeAuditLog[]> {
  assertDisputeEngineLocked();
  return storage.getAllDisputeAuditLogs();
}

export async function getUserDisputeProfile(userId: string): Promise<{
  disputesInitiated: Phase5Dispute[];
  disputesAgainst: Phase5Dispute[];
  chargebackFlag: ChargebackFlag | null;
  auditLogs: DisputeAuditLog[];
  isLocked: boolean;
}> {
  assertDisputeEngineLocked();

  const [disputesInitiated, disputesAgainst, auditLogs, isLocked] = await Promise.all([
    storage.getPhase5DisputesByUser(userId),
    storage.getPhase5DisputesByAccused(userId),
    storage.getDisputeAuditLogsForUser(userId),
    storage.isUserLockedForChargebacks(userId),
  ]);

  let chargebackFlag: ChargebackFlag | null = null;
  try {
    chargebackFlag = await storage.getOrCreateChargebackFlag(userId);
  } catch (e) {
  }

  return {
    disputesInitiated,
    disputesAgainst,
    chargebackFlag,
    auditLogs,
    isLocked,
  };
}

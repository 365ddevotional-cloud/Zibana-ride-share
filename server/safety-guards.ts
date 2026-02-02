// =============================================
// PHASE 4: SAFETY & INCIDENT INTELLIGENCE GUARDS
// =============================================

import { storage } from "./storage";
import {
  SAFETY_ENGINE_LOCKED,
  assertSafetyEngineLocked,
  ESCALATION_CONFIG,
  getEscalationConfig,
  requiresImmediateAction,
  getSuspensionDurationHours,
  hasExceededMediumThreshold,
  shouldEscalateByTrustScore,
  type SeverityLevel,
  type ReporterRole,
  type IncidentType,
} from "@shared/safety-config";
import type {
  SosTrigger,
  Incident,
  UserSuspension,
  SafetyAuditLog,
} from "@shared/schema";

// Re-export engine lock for external checks
export { SAFETY_ENGINE_LOCKED, assertSafetyEngineLocked };

// =============================================
// SOS TRIGGER FUNCTIONALITY
// =============================================

export interface SosTriggerResult {
  success: boolean;
  triggerId?: string;
  error?: string;
}

export async function triggerSos(
  tripId: string,
  triggeredBy: string,
  triggeredByRole: ReporterRole,
  isSilentMode: boolean,
  gpsData?: {
    latitude?: string;
    longitude?: string;
    speed?: string;
    routePolyline?: string;
  }
): Promise<SosTriggerResult> {
  assertSafetyEngineLocked();

  try {
    const trip = await storage.getTripById(tripId);
    if (!trip) {
      return { success: false, error: "Trip not found" };
    }

    if (trip.status !== "in_progress" && trip.status !== "accepted") {
      return { success: false, error: "SOS can only be triggered during active trips" };
    }

    const isValidReporter = 
      (triggeredByRole === "RIDER" && trip.riderId === triggeredBy) ||
      (triggeredByRole === "DRIVER" && trip.driverId === triggeredBy);

    if (!isValidReporter) {
      return { success: false, error: "Invalid reporter for this trip" };
    }

    const snapshotData = JSON.stringify({
      tripDetails: {
        tripId: trip.id,
        status: trip.status,
        pickupLocation: trip.pickupLocation,
        dropoffLocation: trip.dropoffLocation,
        fare: trip.fare,
        currencyCode: trip.currencyCode,
      },
      timestamp: new Date().toISOString(),
      gpsData,
    });

    const trigger = await storage.createSosTrigger({
      tripId,
      triggeredBy,
      triggeredByRole,
      isSilentMode,
      latitude: gpsData?.latitude || null,
      longitude: gpsData?.longitude || null,
      speed: gpsData?.speed || null,
      routePolyline: gpsData?.routePolyline || null,
      riderId: trip.riderId,
      driverId: trip.driverId || null,
      tripStatus: trip.status,
      snapshotData,
    });

    await storage.createSafetyAuditLog({
      userId: triggeredBy,
      sosTriggerId: trigger.id,
      actionType: "SOS_TRIGGERED",
      actionBy: triggeredBy,
      actionByRole: triggeredByRole,
      metadata: JSON.stringify({
        tripId,
        isSilentMode,
        gpsData,
      }),
    });

    return { success: true, triggerId: trigger.id };
  } catch (error) {
    console.error("Error triggering SOS:", error);
    return { success: false, error: "Failed to trigger SOS" };
  }
}

// =============================================
// INCIDENT REPORTING
// =============================================

export interface IncidentReportResult {
  success: boolean;
  incidentId?: string;
  autoSuspended?: boolean;
  error?: string;
}

export async function reportIncident(
  tripId: string,
  reporterId: string,
  reporterRole: ReporterRole,
  accusedUserId: string,
  incidentType: IncidentType,
  severity: SeverityLevel,
  description: string,
  evidenceMetadata?: string,
  countryCode?: string
): Promise<IncidentReportResult> {
  assertSafetyEngineLocked();

  try {
    const trip = await storage.getTripById(tripId);
    if (!trip) {
      return { success: false, error: "Trip not found" };
    }

    const isValidReporter = 
      (reporterRole === "RIDER" && trip.riderId === reporterId) ||
      (reporterRole === "DRIVER" && trip.driverId === reporterId);

    if (!isValidReporter) {
      return { success: false, error: "Invalid reporter for this trip" };
    }

    const isAccusedInTrip = trip.riderId === accusedUserId || trip.driverId === accusedUserId;
    if (!isAccusedInTrip) {
      return { success: false, error: "Accused user not part of this trip" };
    }

    if (reporterId === accusedUserId) {
      return { success: false, error: "Cannot report yourself" };
    }

    const incident = await storage.createIncident({
      tripId,
      reporterId,
      reporterRole,
      accusedUserId,
      incidentType,
      severity,
      description,
      evidenceMetadata: evidenceMetadata || null,
      status: "OPEN",
      countryCode: countryCode || trip.countryCode || null,
    });

    await storage.createSafetyAuditLog({
      userId: accusedUserId,
      incidentId: incident.id,
      actionType: "INCIDENT_CREATED",
      actionBy: reporterId,
      actionByRole: reporterRole,
      metadata: JSON.stringify({
        tripId,
        incidentType,
        severity,
      }),
    });

    const autoSuspended = await processIncidentIntelligence(incident);

    return {
      success: true,
      incidentId: incident.id,
      autoSuspended,
    };
  } catch (error) {
    console.error("Error reporting incident:", error);
    return { success: false, error: "Failed to report incident" };
  }
}

// =============================================
// INCIDENT INTELLIGENCE ENGINE
// =============================================

async function processIncidentIntelligence(incident: Incident): Promise<boolean> {
  assertSafetyEngineLocked();

  const config = getEscalationConfig(incident.countryCode || undefined);
  let shouldSuspend = false;
  let escalationReason = "";

  if (requiresImmediateAction(incident.severity as SeverityLevel)) {
    shouldSuspend = true;
    escalationReason = `Immediate suspension: ${incident.severity} severity incident`;
  }

  if (!shouldSuspend && incident.severity === "MEDIUM") {
    const mediumCount = await storage.countIncidentsBySeverity(
      incident.accusedUserId,
      "MEDIUM",
      config.INCIDENT_WINDOW_DAYS
    );
    if (hasExceededMediumThreshold(mediumCount, incident.countryCode || undefined)) {
      shouldSuspend = true;
      escalationReason = `Escalation: ${mediumCount} MEDIUM incidents in ${config.INCIDENT_WINDOW_DAYS} days`;
    }
  }

  if (!shouldSuspend) {
    const trustProfile = await storage.getUserTrustProfile(incident.accusedUserId);
    if (trustProfile && shouldEscalateByTrustScore(trustProfile.trustScore, incident.countryCode || undefined)) {
      shouldSuspend = true;
      escalationReason = `Low trust score escalation: trust score ${trustProfile.trustScore} below threshold`;
    }
  }

  if (shouldSuspend) {
    await storage.markIncidentAutoEscalated(incident.id, escalationReason);

    await storage.createSafetyAuditLog({
      userId: incident.accusedUserId,
      incidentId: incident.id,
      actionType: "AUTO_ESCALATED",
      reason: escalationReason,
      metadata: JSON.stringify({
        severity: incident.severity,
        incidentType: incident.incidentType,
      }),
    });

    await suspendUser(
      incident.accusedUserId,
      "TEMPORARY",
      escalationReason,
      incident.id,
      "SYSTEM",
      getSuspensionDurationHours(incident.severity as SeverityLevel)
    );

    return true;
  }

  return false;
}

// =============================================
// USER SUSPENSION MANAGEMENT
// =============================================

export interface SuspensionResult {
  success: boolean;
  suspensionId?: string;
  error?: string;
}

export async function suspendUser(
  userId: string,
  suspensionType: "TEMPORARY" | "PERMANENT",
  reason: string,
  relatedIncidentId: string | null,
  suspendedBy: string,
  durationHours?: number
): Promise<SuspensionResult> {
  assertSafetyEngineLocked();

  try {
    const existingSuspension = await storage.getActiveSuspensionForUser(userId);
    if (existingSuspension) {
      return { success: false, error: "User already has an active suspension" };
    }

    const expiresAt = suspensionType === "TEMPORARY" && durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    const suspension = await storage.createUserSuspension({
      userId,
      suspensionType,
      status: "ACTIVE",
      reason,
      relatedIncidentId,
      suspendedBy,
      expiresAt,
    });

    await storage.createSafetyAuditLog({
      userId,
      suspensionId: suspension.id,
      incidentId: relatedIncidentId || undefined,
      actionType: suspensionType === "PERMANENT" ? "USER_BANNED" : "USER_SUSPENDED",
      actionBy: suspendedBy,
      reason,
      metadata: JSON.stringify({
        suspensionType,
        durationHours,
        expiresAt: expiresAt?.toISOString(),
      }),
    });

    return { success: true, suspensionId: suspension.id };
  } catch (error) {
    console.error("Error suspending user:", error);
    return { success: false, error: "Failed to suspend user" };
  }
}

export async function liftUserSuspension(
  suspensionId: string,
  liftedBy: string,
  reason: string
): Promise<SuspensionResult> {
  assertSafetyEngineLocked();

  try {
    const suspension = await storage.getUserSuspension(suspensionId);
    if (!suspension) {
      return { success: false, error: "Suspension not found" };
    }

    if (suspension.status !== "ACTIVE") {
      return { success: false, error: "Suspension is not active" };
    }

    await storage.liftSuspension(suspensionId, liftedBy, reason);

    await storage.createSafetyAuditLog({
      userId: suspension.userId,
      suspensionId,
      actionType: "SUSPENSION_LIFTED",
      actionBy: liftedBy,
      reason,
      previousState: "ACTIVE",
      newState: "LIFTED",
    });

    return { success: true, suspensionId };
  } catch (error) {
    console.error("Error lifting suspension:", error);
    return { success: false, error: "Failed to lift suspension" };
  }
}

// =============================================
// ENFORCEMENT CHECKS
// =============================================

export async function canUserGoOnline(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  assertSafetyEngineLocked();

  const isSuspended = await storage.isUserSuspended(userId);
  if (isSuspended) {
    const suspension = await storage.getActiveSuspensionForUser(userId);
    return {
      allowed: false,
      reason: `Account suspended: ${suspension?.reason || "Safety violation"}`,
    };
  }

  return { allowed: true };
}

export async function canUserAcceptRides(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  return canUserGoOnline(userId);
}

export async function canUserWithdraw(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  assertSafetyEngineLocked();

  const isSuspended = await storage.isUserSuspended(userId);
  if (isSuspended) {
    return {
      allowed: false,
      reason: "Withdrawals blocked due to account suspension",
    };
  }

  return { allowed: true };
}

// =============================================
// ADMIN INCIDENT QUEUE ACTIONS
// =============================================

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

export async function adminReviewIncident(
  incidentId: string,
  adminId: string
): Promise<AdminActionResult> {
  assertSafetyEngineLocked();

  try {
    const incident = await storage.getIncident(incidentId);
    if (!incident) {
      return { success: false, error: "Incident not found" };
    }

    await storage.assignIncidentToAdmin(incidentId, adminId);

    await storage.createSafetyAuditLog({
      userId: incident.accusedUserId,
      incidentId,
      actionType: "ADMIN_REVIEWED",
      actionBy: adminId,
      actionByRole: "admin",
      previousState: incident.status,
      newState: "UNDER_REVIEW",
    });

    return { success: true };
  } catch (error) {
    console.error("Error reviewing incident:", error);
    return { success: false, error: "Failed to review incident" };
  }
}

export async function adminApproveIncident(
  incidentId: string,
  adminId: string,
  notes: string,
  suspendUser: boolean = false,
  isPermanentBan: boolean = false
): Promise<AdminActionResult> {
  assertSafetyEngineLocked();

  try {
    const incident = await storage.getIncident(incidentId);
    if (!incident) {
      return { success: false, error: "Incident not found" };
    }

    await storage.updateIncidentStatus(incidentId, "RESOLVED", notes, adminId);

    await storage.createSafetyAuditLog({
      userId: incident.accusedUserId,
      incidentId,
      actionType: "ADMIN_APPROVED",
      actionBy: adminId,
      actionByRole: "admin",
      reason: notes,
      previousState: incident.status,
      newState: "RESOLVED",
    });

    if (suspendUser) {
      const suspensionType = isPermanentBan ? "PERMANENT" : "TEMPORARY";
      const durationHours = isPermanentBan ? undefined : getSuspensionDurationHours(incident.severity as SeverityLevel);
      
      await suspendUserInternal(
        incident.accusedUserId,
        suspensionType,
        `Admin action: ${notes}`,
        incidentId,
        adminId,
        durationHours
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error approving incident:", error);
    return { success: false, error: "Failed to approve incident" };
  }
}

async function suspendUserInternal(
  userId: string,
  suspensionType: "TEMPORARY" | "PERMANENT",
  reason: string,
  relatedIncidentId: string | null,
  suspendedBy: string,
  durationHours?: number
): Promise<void> {
  const existingSuspension = await storage.getActiveSuspensionForUser(userId);
  if (existingSuspension) return;

  const expiresAt = suspensionType === "TEMPORARY" && durationHours
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
    : null;

  const suspension = await storage.createUserSuspension({
    userId,
    suspensionType,
    status: "ACTIVE",
    reason,
    relatedIncidentId,
    suspendedBy,
    expiresAt,
  });

  await storage.createSafetyAuditLog({
    userId,
    suspensionId: suspension.id,
    incidentId: relatedIncidentId || undefined,
    actionType: suspensionType === "PERMANENT" ? "USER_BANNED" : "USER_SUSPENDED",
    actionBy: suspendedBy,
    reason,
  });
}

export async function adminDismissIncident(
  incidentId: string,
  adminId: string,
  reason: string
): Promise<AdminActionResult> {
  assertSafetyEngineLocked();

  try {
    const incident = await storage.getIncident(incidentId);
    if (!incident) {
      return { success: false, error: "Incident not found" };
    }

    await storage.updateIncidentStatus(incidentId, "DISMISSED", reason, adminId);

    await storage.createSafetyAuditLog({
      userId: incident.accusedUserId,
      incidentId,
      actionType: "ADMIN_DISMISSED",
      actionBy: adminId,
      actionByRole: "admin",
      reason,
      previousState: incident.status,
      newState: "DISMISSED",
    });

    return { success: true };
  } catch (error) {
    console.error("Error dismissing incident:", error);
    return { success: false, error: "Failed to dismiss incident" };
  }
}

export async function adminEscalateIncident(
  incidentId: string,
  adminId: string,
  reason: string
): Promise<AdminActionResult> {
  assertSafetyEngineLocked();

  try {
    const incident = await storage.getIncident(incidentId);
    if (!incident) {
      return { success: false, error: "Incident not found" };
    }

    await storage.markIncidentAutoEscalated(incidentId, `Admin escalation: ${reason}`);

    await storage.createSafetyAuditLog({
      userId: incident.accusedUserId,
      incidentId,
      actionType: "ADMIN_ESCALATED",
      actionBy: adminId,
      actionByRole: "admin",
      reason,
    });

    return { success: true };
  } catch (error) {
    console.error("Error escalating incident:", error);
    return { success: false, error: "Failed to escalate incident" };
  }
}

export async function adminBanUser(
  userId: string,
  adminId: string,
  reason: string,
  relatedIncidentId?: string
): Promise<SuspensionResult> {
  return suspendUser(userId, "PERMANENT", reason, relatedIncidentId || null, adminId);
}

// =============================================
// ADMIN READ-ONLY VIEWS
// =============================================

export async function getIncidentQueue(): Promise<Incident[]> {
  assertSafetyEngineLocked();
  return storage.getAllOpenIncidents();
}

export async function getAllSuspensions(): Promise<UserSuspension[]> {
  assertSafetyEngineLocked();
  return storage.getAllActiveSuspensions();
}

export async function getSafetyAuditLogs(): Promise<SafetyAuditLog[]> {
  assertSafetyEngineLocked();
  return storage.getAllSafetyAuditLogs();
}

export async function getUserSafetyProfile(userId: string): Promise<{
  incidents: Incident[];
  suspensions: UserSuspension[];
  sosTriggers: SosTrigger[];
  auditLogs: SafetyAuditLog[];
  isSuspended: boolean;
}> {
  assertSafetyEngineLocked();

  const [incidentsAgainst, suspensions, sosTriggers, auditLogs, isSuspended] = await Promise.all([
    storage.getIncidentsByAccused(userId),
    storage.getUserSuspensions(userId),
    storage.getSosTriggersByUser(userId),
    storage.getSafetyAuditLogsForUser(userId),
    storage.isUserSuspended(userId),
  ]);

  return {
    incidents: incidentsAgainst,
    suspensions,
    sosTriggers,
    auditLogs,
    isSuspended,
  };
}

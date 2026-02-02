// =============================================
// PRE-LAUNCH COMPLIANCE & STORE READINESS GUARDS
// =============================================

import { storage } from "./storage";
import {
  SOFT_LAUNCH,
  HARD_LAUNCH,
  COMPLIANCE_READY,
  STORE_READY,
  CONSENT_CONFIG,
  RATE_LIMIT_CONFIG,
  TEST_MODE_CONFIG,
  STORE_METADATA,
  getComplianceStatus,
  getReadinessSummary,
  assertComplianceReady,
  type ConsentType,
  type LegalDocumentType,
} from "@shared/compliance-config";

// Re-export for external use
export { SOFT_LAUNCH, HARD_LAUNCH, COMPLIANCE_READY, STORE_READY };

// =============================================
// LAUNCH MODE GUARDS
// =============================================

export function isSoftLaunch(): boolean {
  return SOFT_LAUNCH && !HARD_LAUNCH;
}

export function isHardLaunch(): boolean {
  return HARD_LAUNCH;
}

export async function toggleLaunchMode(
  mode: "SOFT_LAUNCH" | "HARD_LAUNCH",
  value: boolean,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  assertComplianceReady();

  try {
    await storage.setLaunchSetting(mode, value, adminId, `${mode} toggled to ${value}`);
    
    await storage.createComplianceAuditLog({
      category: "LAUNCH_MODE_CHANGE",
      actionBy: adminId,
      actionByRole: "super_admin",
      eventType: `${mode}_TOGGLE`,
      eventData: JSON.stringify({ mode, value }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error toggling launch mode:", error);
    return { success: false, error: "Failed to toggle launch mode" };
  }
}

// =============================================
// CONSENT MANAGEMENT
// =============================================

export async function grantConsent(
  userId: string,
  consentType: ConsentType,
  ipAddress?: string,
  userAgent?: string,
  countryCode?: string
): Promise<{ success: boolean; consentId?: string; error?: string }> {
  assertComplianceReady();

  try {
    const existing = await storage.getUserConsentByType(userId, consentType);
    
    if (existing && existing.granted) {
      return { success: true, consentId: existing.id };
    }

    if (existing) {
      await storage.updateUserConsent(userId, consentType, true);
      
      await storage.createComplianceAuditLog({
        category: "CONSENT_GRANTED",
        userId,
        eventType: "CONSENT_UPDATED",
        eventData: JSON.stringify({ consentType, version: CONSENT_CONFIG.VERSION }),
        ipAddress,
        countryCode,
      });

      return { success: true, consentId: existing.id };
    }

    const consent = await storage.createUserConsent({
      userId,
      consentType,
      version: CONSENT_CONFIG.VERSION,
      granted: true,
      grantedAt: new Date(),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      countryCode: countryCode || null,
    });

    await storage.createComplianceAuditLog({
      category: "CONSENT_GRANTED",
      userId,
      eventType: "CONSENT_CREATED",
      eventData: JSON.stringify({ consentType, version: CONSENT_CONFIG.VERSION }),
      ipAddress,
      countryCode,
    });

    return { success: true, consentId: consent.id };
  } catch (error) {
    console.error("Error granting consent:", error);
    return { success: false, error: "Failed to grant consent" };
  }
}

export async function revokeConsent(
  userId: string,
  consentType: ConsentType,
  ipAddress?: string
): Promise<{ success: boolean; error?: string }> {
  assertComplianceReady();

  try {
    await storage.updateUserConsent(userId, consentType, false);

    await storage.createComplianceAuditLog({
      category: "CONSENT_REVOKED",
      userId,
      eventType: "CONSENT_REVOKED",
      eventData: JSON.stringify({ consentType }),
      ipAddress,
    });

    return { success: true };
  } catch (error) {
    console.error("Error revoking consent:", error);
    return { success: false, error: "Failed to revoke consent" };
  }
}

export async function checkRequiredConsents(
  userId: string,
  role: string
): Promise<{ complete: boolean; missing: string[] }> {
  const requiredTypes = role === "driver" 
    ? CONSENT_CONFIG.DRIVER_REQUIRED_CONSENTS 
    : CONSENT_CONFIG.REQUIRED_CONSENTS;

  const consents = await storage.getUserConsents(userId);
  const grantedTypes = consents.filter(c => c.granted).map(c => c.consentType);
  
  const missing = requiredTypes.filter(type => !grantedTypes.includes(type as any));
  
  return {
    complete: missing.length === 0,
    missing,
  };
}

export async function grantAllRequiredConsents(
  userId: string,
  role: string,
  ipAddress?: string,
  userAgent?: string,
  countryCode?: string
): Promise<{ success: boolean; error?: string }> {
  const requiredTypes = role === "driver"
    ? CONSENT_CONFIG.DRIVER_REQUIRED_CONSENTS
    : CONSENT_CONFIG.REQUIRED_CONSENTS;

  for (const consentType of requiredTypes) {
    const result = await grantConsent(userId, consentType, ipAddress, userAgent, countryCode);
    if (!result.success) {
      return result;
    }
  }

  return { success: true };
}

// =============================================
// KILL SWITCH MANAGEMENT
// =============================================

export async function activateKillSwitch(
  switchName: string,
  reason: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  assertComplianceReady();

  try {
    await storage.activateKillSwitch(switchName, reason, adminId);

    await storage.createComplianceAuditLog({
      category: "KILL_SWITCH_TOGGLE",
      actionBy: adminId,
      actionByRole: "super_admin",
      eventType: "KILL_SWITCH_ACTIVATED",
      eventData: JSON.stringify({ switchName, reason }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error activating kill switch:", error);
    return { success: false, error: "Failed to activate kill switch" };
  }
}

export async function deactivateKillSwitch(
  switchName: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  assertComplianceReady();

  try {
    await storage.deactivateKillSwitch(switchName, adminId);

    await storage.createComplianceAuditLog({
      category: "KILL_SWITCH_TOGGLE",
      actionBy: adminId,
      actionByRole: "super_admin",
      eventType: "KILL_SWITCH_DEACTIVATED",
      eventData: JSON.stringify({ switchName }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error deactivating kill switch:", error);
    return { success: false, error: "Failed to deactivate kill switch" };
  }
}

export async function isKillSwitchActive(switchName: string): Promise<boolean> {
  return storage.isKillSwitchActive(switchName);
}

export async function checkGlobalKillSwitch(): Promise<boolean> {
  return storage.isKillSwitchActive("GLOBAL_KILL");
}

// =============================================
// TEST MODE ISOLATION
// =============================================

export async function markAsTestUser(
  userId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  assertComplianceReady();

  try {
    await storage.markUserAsTest(userId, adminId);

    await storage.createComplianceAuditLog({
      category: "ADMIN_ACTION",
      userId,
      actionBy: adminId,
      actionByRole: "super_admin",
      eventType: "USER_MARKED_AS_TEST",
      isTestMode: true,
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking test user:", error);
    return { success: false, error: "Failed to mark as test user" };
  }
}

export async function unmarkAsTestUser(
  userId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  assertComplianceReady();

  try {
    await storage.unmarkUserAsTest(userId);

    await storage.createComplianceAuditLog({
      category: "ADMIN_ACTION",
      userId,
      actionBy: adminId,
      actionByRole: "super_admin",
      eventType: "USER_UNMARKED_AS_TEST",
    });

    return { success: true };
  } catch (error) {
    console.error("Error unmarking test user:", error);
    return { success: false, error: "Failed to unmark test user" };
  }
}

export async function isTestUser(userId: string): Promise<boolean> {
  return storage.isTestUser(userId);
}

export async function shouldExcludeFromAnalytics(userId: string): Promise<boolean> {
  const flag = await storage.getTestUserFlag(userId);
  return flag?.excludeFromAnalytics || false;
}

export async function shouldExcludeFromRevenue(userId: string): Promise<boolean> {
  const flag = await storage.getTestUserFlag(userId);
  return flag?.excludeFromRevenue || false;
}

// =============================================
// COMPLIANCE CONFIRMATION
// =============================================

export async function confirmFirstUseCompliance(
  userId: string,
  ipAddress?: string,
  deviceInfo?: string
): Promise<{ success: boolean; error?: string }> {
  assertComplianceReady();

  try {
    const hasConfirmation = await storage.hasComplianceConfirmation(userId, "FIRST_USE");
    if (hasConfirmation) {
      return { success: true };
    }

    await storage.createComplianceConfirmation({
      userId,
      confirmationType: "FIRST_USE",
      version: CONSENT_CONFIG.VERSION,
      ipAddress: ipAddress || null,
      deviceInfo: deviceInfo || null,
    });

    await storage.createComplianceAuditLog({
      category: "COMPLIANCE_CHECK",
      userId,
      eventType: "FIRST_USE_CONFIRMED",
      eventData: JSON.stringify({ version: CONSENT_CONFIG.VERSION }),
      ipAddress,
    });

    return { success: true };
  } catch (error) {
    console.error("Error confirming first use:", error);
    return { success: false, error: "Failed to confirm first use" };
  }
}

// =============================================
// LEGAL DOCUMENT MANAGEMENT
// =============================================

export async function getActiveLegalDocuments() {
  return storage.getActiveLegalDocuments();
}

export async function getLegalDocument(documentType: LegalDocumentType) {
  return storage.getActiveLegalDocumentByType(documentType);
}

// =============================================
// AUDIT & EXPORT
// =============================================

export async function logComplianceEvent(
  category: string,
  eventType: string,
  data: {
    userId?: string;
    actionBy?: string;
    actionByRole?: string;
    tripId?: string;
    paymentId?: string;
    incidentId?: string;
    disputeId?: string;
    ipAddress?: string;
    countryCode?: string;
    isTestMode?: boolean;
    eventData?: any;
  }
): Promise<void> {
  await storage.createComplianceAuditLog({
    category: category as any,
    userId: data.userId || null,
    actionBy: data.actionBy || null,
    actionByRole: data.actionByRole || null,
    eventType,
    eventData: data.eventData ? JSON.stringify(data.eventData) : null,
    tripId: data.tripId || null,
    paymentId: data.paymentId || null,
    incidentId: data.incidentId || null,
    disputeId: data.disputeId || null,
    ipAddress: data.ipAddress || null,
    countryCode: data.countryCode || null,
    isTestMode: data.isTestMode || false,
  });
}

export async function getComplianceAuditLogsForExport(
  filters?: {
    category?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  if (filters?.category) {
    return storage.getComplianceAuditLogsByCategory(filters.category);
  }
  if (filters?.userId) {
    return storage.getComplianceAuditLogsByUser(filters.userId);
  }
  return storage.getComplianceAuditLogs(filters?.limit);
}

// =============================================
// READINESS VERIFICATION
// =============================================

export function getStoreMetadata() {
  return STORE_METADATA;
}

export function verifyCompliance() {
  return getComplianceStatus();
}

export function getFullReadinessSummary() {
  return getReadinessSummary();
}

export async function getSystemReadinessReport(): Promise<{
  compliant: boolean;
  softLaunch: boolean;
  hardLaunch: boolean;
  storeReady: boolean;
  checklist: {
    legalDocumentsActive: boolean;
    consentSystemActive: boolean;
    testModeIsolated: boolean;
    softLaunchEnabled: boolean;
    auditLoggingActive: boolean;
    rateLimitsEnabled: boolean;
    killSwitchReady: boolean;
    storeMetadataReady: boolean;
  };
  killSwitches: {
    name: string;
    active: boolean;
  }[];
  launchSettings: {
    key: string;
    value: boolean;
  }[];
  testUsersCount: number;
}> {
  const [killSwitches, launchSettings, testUsers] = await Promise.all([
    storage.getAllKillSwitchStates(),
    storage.getAllLaunchSettings(),
    storage.getAllTestUsers(),
  ]);

  const readiness = getReadinessSummary();

  return {
    ...readiness,
    killSwitches: killSwitches.map(k => ({ name: k.switchName, active: k.isActive })),
    launchSettings: launchSettings.map(l => ({ key: l.settingKey, value: l.settingValue })),
    testUsersCount: testUsers.length,
  };
}

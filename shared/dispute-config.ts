// =============================================
// PHASE 5: DISPUTES, REFUNDS & LEGAL RESOLUTION CONFIG
// =============================================

// ENGINE LOCK - CANNOT BE REMOVED WITHOUT CODE CHANGE
export const DISPUTE_ENGINE_LOCKED = true as const;

export function assertDisputeEngineLocked(): void {
  if (!DISPUTE_ENGINE_LOCKED) {
    throw new Error("FATAL: Dispute engine lock has been removed. This is a critical security violation.");
  }
}

// Dispute Types
export const DISPUTE_TYPES = [
  "OVERCHARGE",
  "NO_SHOW",
  "UNSAFE_BEHAVIOR",
  "SERVICE_QUALITY",
  "DAMAGE",
  "OTHER",
] as const;

export type DisputeType = typeof DISPUTE_TYPES[number];

// Dispute Status
export const DISPUTE_STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"] as const;
export type DisputeStatus = typeof DISPUTE_STATUSES[number];

// Initiator Roles
export const INITIATOR_ROLES = ["RIDER", "DRIVER"] as const;
export type InitiatorRole = typeof INITIATOR_ROLES[number];

// Refund Types
export const REFUND_TYPES = ["FULL_REFUND", "PARTIAL_REFUND", "NO_REFUND"] as const;
export type RefundType = typeof REFUND_TYPES[number];

// Refund Outcome Status
export const REFUND_OUTCOME_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PROCESSED"] as const;
export type RefundOutcomeStatus = typeof REFUND_OUTCOME_STATUSES[number];

// Dispute Configuration
export const DISPUTE_CONFIG = {
  // Default dispute window in hours (72 hours = 3 days)
  DEFAULT_DISPUTE_WINDOW_HOURS: 72,
  
  // Minimum characters for dispute description
  MIN_DESCRIPTION_LENGTH: 20,
  
  // Maximum disputes per user per month before flagging
  MAX_DISPUTES_PER_MONTH: 5,
  
  // Chargeback threshold before account lock
  CHARGEBACK_THRESHOLD: 3,
  
  // Trust score impact per dispute outcome
  TRUST_IMPACT: {
    DISPUTE_RESOLVED_AGAINST: -15, // User lost dispute
    DISPUTE_RESOLVED_FOR: 0, // User won dispute (no penalty)
    DISPUTE_REJECTED: -5, // Frivolous dispute
  } as const,
  
  // Auto-flag thresholds
  AUTO_FLAG_THRESHOLDS: {
    DISPUTES_IN_30_DAYS: 3,
    CHARGEBACKS_IN_90_DAYS: 2,
  } as const,
} as const;

// Country-specific dispute window overrides (in hours)
export const COUNTRY_DISPUTE_WINDOWS: Record<string, number> = {
  NG: 48, // Nigeria: 48 hours
  ZA: 72, // South Africa: 72 hours
  US: 72, // USA: 72 hours
};

// Get effective dispute window for a country
export function getDisputeWindowHours(countryCode?: string): number {
  if (countryCode && COUNTRY_DISPUTE_WINDOWS[countryCode]) {
    return COUNTRY_DISPUTE_WINDOWS[countryCode];
  }
  return DISPUTE_CONFIG.DEFAULT_DISPUTE_WINDOW_HOURS;
}

// Check if trip is within dispute window
export function isWithinDisputeWindow(
  tripCompletedAt: Date,
  countryCode?: string
): boolean {
  const windowHours = getDisputeWindowHours(countryCode);
  const windowMs = windowHours * 60 * 60 * 1000;
  const now = Date.now();
  const tripTime = tripCompletedAt.getTime();
  return now - tripTime <= windowMs;
}

// Dispute audit action types
export const DISPUTE_AUDIT_ACTIONS = [
  "DISPUTE_CREATED",
  "DISPUTE_REVIEWED",
  "DISPUTE_APPROVED",
  "DISPUTE_REJECTED",
  "DISPUTE_ESCALATED",
  "REFUND_INITIATED",
  "REFUND_APPROVED",
  "REFUND_REJECTED",
  "REFUND_PROCESSED",
  "PARTIAL_ADJUSTMENT",
  "CHARGEBACK_REPORTED",
  "CHARGEBACK_WON",
  "CHARGEBACK_LOST",
  "ACCOUNT_FLAGGED",
  "ACCOUNT_LOCKED",
] as const;

export type DisputeAuditAction = typeof DISPUTE_AUDIT_ACTIONS[number];

// Check if user has exceeded dispute threshold
export function hasExceededDisputeThreshold(disputeCount: number): boolean {
  return disputeCount >= DISPUTE_CONFIG.AUTO_FLAG_THRESHOLDS.DISPUTES_IN_30_DAYS;
}

// Check if user has exceeded chargeback threshold
export function hasExceededChargebackThreshold(chargebackCount: number): boolean {
  return chargebackCount >= DISPUTE_CONFIG.AUTO_FLAG_THRESHOLDS.CHARGEBACKS_IN_90_DAYS;
}

// Should lock account due to chargebacks
export function shouldLockAccountForChargebacks(chargebackCount: number): boolean {
  return chargebackCount >= DISPUTE_CONFIG.CHARGEBACK_THRESHOLD;
}

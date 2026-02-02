// =============================================
// PHASE 4: SAFETY & INCIDENT INTELLIGENCE CONFIG
// =============================================

// ENGINE LOCK - CANNOT BE REMOVED WITHOUT CODE CHANGE
export const SAFETY_ENGINE_LOCKED = true as const;

export function assertSafetyEngineLocked(): void {
  if (!SAFETY_ENGINE_LOCKED) {
    throw new Error("FATAL: Safety engine lock has been removed. This is a critical security violation.");
  }
}

// Incident Types
export const INCIDENT_TYPES = [
  "HARASSMENT",
  "ASSAULT",
  "UNSAFE_DRIVING",
  "PAYMENT_COERCION",
  "ACCIDENT",
  "OTHER",
] as const;

export type IncidentType = typeof INCIDENT_TYPES[number];

// Severity Levels
export const SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type SeverityLevel = typeof SEVERITY_LEVELS[number];

// Incident Status
export const INCIDENT_STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const;
export type IncidentStatus = typeof INCIDENT_STATUSES[number];

// Reporter Roles
export const REPORTER_ROLES = ["RIDER", "DRIVER"] as const;
export type ReporterRole = typeof REPORTER_ROLES[number];

// Suspension Types
export const SUSPENSION_TYPES = ["TEMPORARY", "PERMANENT"] as const;
export type SuspensionType = typeof SUSPENSION_TYPES[number];

// Auto-escalation configuration
export const ESCALATION_CONFIG = {
  // Severity thresholds that trigger immediate suspension
  IMMEDIATE_SUSPENSION_SEVERITIES: ["HIGH", "CRITICAL"] as SeverityLevel[],
  
  // Number of MEDIUM incidents before escalation
  MEDIUM_INCIDENT_THRESHOLD: 3,
  
  // Time window for counting repeated incidents (in days)
  INCIDENT_WINDOW_DAYS: 30,
  
  // Trust score threshold below which incidents are auto-escalated
  LOW_TRUST_ESCALATION_THRESHOLD: 40,
  
  // Default temporary suspension duration (in hours)
  DEFAULT_TEMP_SUSPENSION_HOURS: 48,
  
  // Suspension durations by severity (in hours)
  SUSPENSION_DURATION_BY_SEVERITY: {
    LOW: 0, // No automatic suspension
    MEDIUM: 24,
    HIGH: 72,
    CRITICAL: 168, // 7 days
  } as Record<SeverityLevel, number>,
} as const;

// Country-specific escalation overrides (optional)
export const COUNTRY_ESCALATION_OVERRIDES: Record<string, Partial<typeof ESCALATION_CONFIG>> = {
  // Example: Nigeria might have stricter thresholds
  // NG: {
  //   MEDIUM_INCIDENT_THRESHOLD: 2,
  // },
};

// Get effective escalation config for a country
export function getEscalationConfig(countryCode?: string): typeof ESCALATION_CONFIG {
  if (countryCode && COUNTRY_ESCALATION_OVERRIDES[countryCode]) {
    return {
      ...ESCALATION_CONFIG,
      ...COUNTRY_ESCALATION_OVERRIDES[countryCode],
    };
  }
  return ESCALATION_CONFIG;
}

// Safety audit action types
export const SAFETY_AUDIT_ACTIONS = [
  "INCIDENT_CREATED",
  "SOS_TRIGGERED",
  "ADMIN_REVIEWED",
  "ADMIN_APPROVED",
  "ADMIN_DISMISSED",
  "ADMIN_ESCALATED",
  "USER_SUSPENDED",
  "USER_BANNED",
  "SUSPENSION_LIFTED",
  "AUTO_ESCALATED",
] as const;

export type SafetyAuditAction = typeof SAFETY_AUDIT_ACTIONS[number];

// Determine if severity requires immediate action
export function requiresImmediateAction(severity: SeverityLevel): boolean {
  return ESCALATION_CONFIG.IMMEDIATE_SUSPENSION_SEVERITIES.includes(severity);
}

// Calculate suspension duration based on severity
export function getSuspensionDurationHours(severity: SeverityLevel): number {
  return ESCALATION_CONFIG.SUSPENSION_DURATION_BY_SEVERITY[severity];
}

// Check if user has exceeded medium incident threshold
export function hasExceededMediumThreshold(mediumIncidentCount: number, countryCode?: string): boolean {
  const config = getEscalationConfig(countryCode);
  return mediumIncidentCount >= config.MEDIUM_INCIDENT_THRESHOLD;
}

// Check if trust score warrants escalation
export function shouldEscalateByTrustScore(trustScore: number, countryCode?: string): boolean {
  const config = getEscalationConfig(countryCode);
  return trustScore < config.LOW_TRUST_ESCALATION_THRESHOLD;
}

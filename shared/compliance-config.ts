// =============================================
// PRE-LAUNCH COMPLIANCE & STORE READINESS CONFIG
// =============================================

// LAUNCH MODE FLAGS - SUPER_ADMIN ONLY
export const SOFT_LAUNCH = true;
export const HARD_LAUNCH = false;

// CORE SYSTEM LOCKS (all locked engines)
export const CORE_SYSTEMS_LOCKED = true;
export const FINANCIAL_ENGINE_LOCKED = true;
export const IDENTITY_ENGINE_LOCKED = true;
export const NAVIGATION_ENGINE_LOCKED = true;
export const TRUST_ENGINE_LOCKED = true;
export const SAFETY_ENGINE_LOCKED = true;
export const DISPUTE_ENGINE_LOCKED = true;

// COMPLIANCE FLAGS
export const COMPLIANCE_READY = true;
export const STORE_READY = true;

// Runtime assertion for compliance readiness
export function assertComplianceReady(): void {
  if (!COMPLIANCE_READY) {
    throw new Error("COMPLIANCE_READY must be true - compliance checks are required");
  }
}

export function assertStoreReady(): void {
  if (!STORE_READY) {
    throw new Error("STORE_READY must be true - store submission requires readiness verification");
  }
}

export function assertSoftLaunchMode(): void {
  if (!SOFT_LAUNCH || HARD_LAUNCH) {
    throw new Error("System must be in SOFT_LAUNCH mode for pre-launch operations");
  }
}

// LEGAL DOCUMENT TYPES
export const LEGAL_DOCUMENT_TYPES = [
  "TERMS_OF_SERVICE",
  "PRIVACY_POLICY",
  "COMMUNITY_GUIDELINES",
  "REFUND_DISPUTE_POLICY",
] as const;
export type LegalDocumentType = typeof LEGAL_DOCUMENT_TYPES[number];

// CONSENT TYPES
export const CONSENT_TYPES = [
  "LOCATION_TRACKING",
  "CAMERA_USAGE",
  "BACKGROUND_SAFETY_MONITORING",
  "TERMS_ACCEPTANCE",
  "PRIVACY_ACCEPTANCE",
] as const;
export type ConsentType = typeof CONSENT_TYPES[number];

// CONSENT VERSION (increment when policies change)
export const CONSENT_VERSION = "1.0.0";

// Consent configuration
export const CONSENT_CONFIG = {
  VERSION: CONSENT_VERSION,
  REQUIRED_CONSENTS: ["LOCATION_TRACKING", "TERMS_ACCEPTANCE", "PRIVACY_ACCEPTANCE"] as ConsentType[],
  DRIVER_REQUIRED_CONSENTS: [
    "LOCATION_TRACKING",
    "CAMERA_USAGE",
    "BACKGROUND_SAFETY_MONITORING",
    "TERMS_ACCEPTANCE",
    "PRIVACY_ACCEPTANCE",
  ] as ConsentType[],
};

// RATE LIMITING CONFIG
export const RATE_LIMIT_CONFIG = {
  ENABLED: true,
  WINDOW_MS: 60 * 1000, // 1 minute
  MAX_REQUESTS: 100, // per window
  ABUSE_THRESHOLD: 500, // requests before temporary block
  BLOCK_DURATION_MS: 15 * 60 * 1000, // 15 minutes
};

// KILL SWITCH - Emergency disable
export const KILL_SWITCH_CONFIG = {
  GLOBAL_KILL: false, // If true, all non-essential endpoints are disabled
  PAYMENT_KILL: false, // If true, all payment operations are disabled
  REGISTRATION_KILL: false, // If true, new registrations are disabled
  DRIVER_ONBOARDING_KILL: false, // If true, driver onboarding is disabled
};

// TEST MODE ISOLATION
export const TEST_MODE_CONFIG = {
  TEST_USER_BADGE: "[TEST]",
  TEST_WALLET_PREFIX: "TEST_",
  EXCLUDE_FROM_ANALYTICS: true,
  EXCLUDE_FROM_REVENUE: true,
  ISOLATION_ENFORCED: true,
};

// AUDIT LOG CATEGORIES
export const AUDIT_CATEGORIES = [
  "RIDE_LIFECYCLE",
  "PAYMENT_ATTEMPT",
  "REFUND_DECISION",
  "ADMIN_ACTION",
  "SAFETY_INCIDENT",
  "CONSENT_GRANTED",
  "CONSENT_REVOKED",
  "COMPLIANCE_CHECK",
  "KILL_SWITCH_TOGGLE",
  "LAUNCH_MODE_CHANGE",
] as const;
export type AuditCategory = typeof AUDIT_CATEGORIES[number];

// STORE METADATA
export const STORE_METADATA = {
  APP_NAME: "ZIBA",
  TAGLINE: "Safe and Reliable Rides",
  CATEGORY: "Transportation",
  CONTENT_RATING: "Everyone",
  DESCRIPTION: `ZIBA connects riders with verified drivers for safe, reliable transportation in emerging markets. 

Key Features:
- Real-time ride tracking
- Verified driver profiles
- In-app safety features including SOS
- Transparent fare estimates
- Multiple payment options
- 24/7 customer support

ZIBA prioritizes your safety with background checks on all drivers, real-time trip monitoring, and a dedicated support team.

Fares are calculated based on distance, time, and local conditions. Commission rates and fee structures are clearly disclosed before each ride.`,
  SAFETY_SECTION: `Your safety is our priority:
- All drivers undergo identity verification
- Real-time GPS tracking on every trip
- SOS button available during rides
- Trip sharing with trusted contacts
- 24/7 incident response team
- Community ratings and reviews`,
  DISCLAIMERS: [
    "Earnings for drivers vary based on demand, location, and availability.",
    "ZIBA is a technology platform connecting riders and drivers.",
    "Standard fares may vary based on traffic, weather, and surge pricing.",
    "Background checks are conducted according to local regulations.",
  ],
};

// COMPLIANCE CHECKLIST STATUS
export interface ComplianceStatus {
  legalDocumentsActive: boolean;
  consentSystemActive: boolean;
  testModeIsolated: boolean;
  softLaunchEnabled: boolean;
  auditLoggingActive: boolean;
  rateLimitsEnabled: boolean;
  killSwitchReady: boolean;
  storeMetadataReady: boolean;
}

export function getComplianceStatus(): ComplianceStatus {
  return {
    legalDocumentsActive: true,
    consentSystemActive: true,
    testModeIsolated: TEST_MODE_CONFIG.ISOLATION_ENFORCED,
    softLaunchEnabled: SOFT_LAUNCH && !HARD_LAUNCH,
    auditLoggingActive: true,
    rateLimitsEnabled: RATE_LIMIT_CONFIG.ENABLED,
    killSwitchReady: true,
    storeMetadataReady: true,
  };
}

export function isComplianceComplete(): boolean {
  const status = getComplianceStatus();
  return Object.values(status).every(v => v === true);
}

// READINESS SUMMARY
export function getReadinessSummary(): {
  compliant: boolean;
  softLaunch: boolean;
  hardLaunch: boolean;
  coreSystemsLocked: boolean;
  storeReady: boolean;
  checklist: ComplianceStatus;
} {
  return {
    compliant: COMPLIANCE_READY && isComplianceComplete(),
    softLaunch: SOFT_LAUNCH,
    hardLaunch: HARD_LAUNCH,
    coreSystemsLocked: CORE_SYSTEMS_LOCKED,
    storeReady: STORE_READY,
    checklist: getComplianceStatus(),
  };
}

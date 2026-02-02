// =============================================
// PHASE 1: UNIVERSAL IDENTITY FRAMEWORK CONFIG
// =============================================

// IDENTITY ENGINE LOCKED - Cannot be removed without code change
export const IDENTITY_ENGINE_LOCKED = true;

// Government ID types allowed per country
export type GovernmentIdType = 
  | "NIN" 
  | "STATE_ID" | "US_PASSPORT" | "US_DRIVER_LICENSE"
  | "UK_DRIVING_LICENSE" | "UK_PASSPORT"
  | "SA_ID" | "SA_PASSPORT"
  | "NATIONAL_ID" | "PASSPORT" | "OTHER";

export interface CountryIdentityConfig {
  countryCode: string;
  countryName: string;
  allowedIdTypes: GovernmentIdType[];
  primaryIdType: GovernmentIdType;
  driverLicenseRequired: boolean;
}

// Country-specific identity requirements
export const COUNTRY_IDENTITY_CONFIG: Record<string, CountryIdentityConfig> = {
  NG: {
    countryCode: "NG",
    countryName: "Nigeria",
    allowedIdTypes: ["NIN"],
    primaryIdType: "NIN",
    driverLicenseRequired: true,
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    allowedIdTypes: ["STATE_ID", "US_DRIVER_LICENSE", "US_PASSPORT"],
    primaryIdType: "STATE_ID",
    driverLicenseRequired: true,
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    allowedIdTypes: ["UK_DRIVING_LICENSE", "UK_PASSPORT"],
    primaryIdType: "UK_DRIVING_LICENSE",
    driverLicenseRequired: true,
  },
  ZA: {
    countryCode: "ZA",
    countryName: "South Africa",
    allowedIdTypes: ["SA_ID", "SA_PASSPORT"],
    primaryIdType: "SA_ID",
    driverLicenseRequired: true,
  },
};

// Default config for unsupported countries
export const DEFAULT_IDENTITY_CONFIG: CountryIdentityConfig = {
  countryCode: "XX",
  countryName: "Other",
  allowedIdTypes: ["NATIONAL_ID", "PASSPORT", "OTHER"],
  primaryIdType: "NATIONAL_ID",
  driverLicenseRequired: true,
};

// Get identity config for a country
export function getIdentityConfig(countryCode: string): CountryIdentityConfig {
  return COUNTRY_IDENTITY_CONFIG[countryCode] || DEFAULT_IDENTITY_CONFIG;
}

// Check if ID type is valid for country
export function isValidIdTypeForCountry(countryCode: string, idType: GovernmentIdType): boolean {
  const config = getIdentityConfig(countryCode);
  return config.allowedIdTypes.includes(idType);
}

// Assertion to prevent silent removal of identity engine
export function assertIdentityEngineLocked(): void {
  if (!IDENTITY_ENGINE_LOCKED) {
    throw new Error("CRITICAL: Identity engine is not locked. This is a security violation.");
  }
}

// Identity verification requirements for drivers
export interface DriverIdentityRequirements {
  identityApproved: boolean;
  driverLicenseVerified: boolean;
}

// Check if driver meets identity requirements to go online
export function canDriverGoOnline(requirements: DriverIdentityRequirements): boolean {
  return requirements.identityApproved && requirements.driverLicenseVerified;
}

// Check if driver meets identity requirements to accept rides
export function canDriverAcceptRides(requirements: DriverIdentityRequirements): boolean {
  return requirements.identityApproved && requirements.driverLicenseVerified;
}

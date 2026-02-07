export interface CountryLegalConfig {
  countryCode: string;
  countryName: string;
  platformClassification: string;
  driverClassification: string;
  additionalClauses: string[];
  disputeArbitration: boolean;
  classActionWaiver: boolean;
  limitationOfDamages: boolean;
  cashHandlingDisclaimer: string | null;
  consumerProtectionNote: string | null;
}

export const COUNTRY_LEGAL_CONFIG: Record<string, CountryLegalConfig> = {
  NG: {
    countryCode: "NG",
    countryName: "Nigeria",
    platformClassification: "ZIBA is a technology marketplace that facilitates connections between riders and independent driver-partners. ZIBA does not provide transportation services.",
    driverClassification: "Drivers using the ZIBA platform are independent contractors. No employer-employee relationship exists between ZIBA and any driver.",
    additionalClauses: [
      "Use of the ZIBA platform is at your own risk.",
      "ZIBA does not guarantee earnings, trip availability, or employment.",
      "Cash payments are handled directly between rider and driver at the user's own discretion.",
    ],
    disputeArbitration: false,
    classActionWaiver: false,
    limitationOfDamages: true,
    cashHandlingDisclaimer: "Cash transactions occur directly between rider and driver. ZIBA is not responsible for disputes arising from cash payments.",
    consumerProtectionNote: null,
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    platformClassification: "ZIBA is a technology marketplace that facilitates connections between riders and independent driver-partners. ZIBA does not provide transportation services and is not a transportation carrier.",
    driverClassification: "Drivers using the ZIBA platform are independent contractors. No employer-employee relationship exists between ZIBA and any driver.",
    additionalClauses: [
      "Any disputes shall be resolved through binding individual arbitration.",
      "You waive the right to participate in class action lawsuits or class-wide arbitration.",
      "ZIBA's total liability is limited to the fees paid by you in the 12 months preceding any claim.",
      "Use of the ZIBA platform is at your own risk.",
    ],
    disputeArbitration: true,
    classActionWaiver: true,
    limitationOfDamages: true,
    cashHandlingDisclaimer: null,
    consumerProtectionNote: null,
  },
  CA: {
    countryCode: "CA",
    countryName: "Canada",
    platformClassification: "ZIBA is a technology marketplace that facilitates connections between riders and independent driver-partners. ZIBA does not provide transportation services.",
    driverClassification: "Drivers using the ZIBA platform are independent contractors. No employer-employee relationship exists between ZIBA and any driver.",
    additionalClauses: [
      "Any disputes shall be resolved through binding individual arbitration where permitted by law.",
      "You waive the right to participate in class action lawsuits to the extent permitted by applicable law.",
      "ZIBA's total liability is limited to the fees paid by you in the 12 months preceding any claim.",
      "Use of the ZIBA platform is at your own risk.",
    ],
    disputeArbitration: true,
    classActionWaiver: true,
    limitationOfDamages: true,
    cashHandlingDisclaimer: null,
    consumerProtectionNote: null,
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    platformClassification: "ZIBA is a technology marketplace that facilitates connections between riders and independent driver-partners. ZIBA does not provide transportation services.",
    driverClassification: "Drivers using the ZIBA platform are independent contractors. No employer-employee relationship exists between ZIBA and any driver.",
    additionalClauses: [
      "Any disputes shall be resolved through binding individual arbitration where permitted under UK law.",
      "ZIBA's total liability is limited to the fees paid by you in the 12 months preceding any claim.",
      "Use of the ZIBA platform is at your own risk.",
    ],
    disputeArbitration: true,
    classActionWaiver: true,
    limitationOfDamages: true,
    cashHandlingDisclaimer: null,
    consumerProtectionNote: "Nothing in these terms affects your statutory rights under the Consumer Rights Act 2015.",
  },
  ZA: {
    countryCode: "ZA",
    countryName: "South Africa",
    platformClassification: "ZIBA is a technology marketplace that facilitates connections between riders and independent driver-partners. ZIBA does not provide transportation services.",
    driverClassification: "Drivers using the ZIBA platform are independent contractors. No employer-employee relationship exists between ZIBA and any driver.",
    additionalClauses: [
      "ZIBA operates as a marketplace facilitator and does not assume liability for trip outcomes.",
      "Use of the ZIBA platform is at your own risk.",
    ],
    disputeArbitration: false,
    classActionWaiver: false,
    limitationOfDamages: true,
    cashHandlingDisclaimer: "Cash transactions occur directly between rider and driver. ZIBA is not responsible for disputes arising from cash payments.",
    consumerProtectionNote: "These terms are subject to the Consumer Protection Act 68 of 2008 where applicable.",
  },
  GH: {
    countryCode: "GH",
    countryName: "Ghana",
    platformClassification: "ZIBA is a technology marketplace that facilitates connections between riders and independent driver-partners. ZIBA does not provide transportation services.",
    driverClassification: "Drivers using the ZIBA platform are independent contractors. No employer-employee relationship exists between ZIBA and any driver.",
    additionalClauses: [
      "ZIBA operates as a marketplace facilitator and does not assume liability for trip outcomes.",
      "Use of the ZIBA platform is at your own risk.",
    ],
    disputeArbitration: false,
    classActionWaiver: false,
    limitationOfDamages: true,
    cashHandlingDisclaimer: "Cash transactions occur directly between rider and driver. ZIBA is not responsible for disputes arising from cash payments.",
    consumerProtectionNote: null,
  },
};

export const GLOBAL_LEGAL_CONSTANTS = {
  PLATFORM_NATURE: "ZIBA is a digital technology marketplace, not a transportation provider.",
  DRIVER_STATUS: "All drivers are independent contractors. ZIBA does not employ drivers.",
  NO_TRIP_CONTROL: "ZIBA does not control, supervise, or direct individual trips.",
  NO_OUTCOME_GUARANTEE: "ZIBA does not guarantee safety, recovery, compensation, or any specific outcome.",
  ASSUMPTION_OF_RISK: "Use of ZIBA is at the user's own risk. Trips involve inherent risks.",
  INCIDENT_DISCLAIMER: "Reports are for documentation and assistance only. They do not imply fault, liability, or compensation.",
  LOST_ITEM_DISCLAIMER: "ZIBA assists with communication only. Item recovery is not guaranteed. Drivers assist voluntarily.",
  RELIEF_FUND_DISCLAIMER: "Relief funds are discretionary goodwill programs, not insurance or entitlements.",
  HUB_DISCLAIMER: "Safe Return Hubs are independent partner entities. ZIBA does not take custody of items.",
};

export type LegalAcknowledgementType =
  | "TERMS_ACCEPTANCE"
  | "ASSUMPTION_OF_RISK"
  | "LOST_ITEM_DISCLAIMER"
  | "ACCIDENT_DISCLAIMER"
  | "INCIDENT_DISCLAIMER"
  | "DRIVER_REGISTRATION_TERMS"
  | "POLICY_UPDATE_ACCEPTANCE";

export function getCountryLegalConfig(countryCode: string): CountryLegalConfig {
  return COUNTRY_LEGAL_CONFIG[countryCode] || COUNTRY_LEGAL_CONFIG["NG"];
}

export function getCountryClauses(countryCode: string): string[] {
  const config = getCountryLegalConfig(countryCode);
  return config.additionalClauses;
}

export function requiresArbitration(countryCode: string): boolean {
  const config = getCountryLegalConfig(countryCode);
  return config.disputeArbitration;
}

export function requiresClassActionWaiver(countryCode: string): boolean {
  const config = getCountryLegalConfig(countryCode);
  return config.classActionWaiver;
}

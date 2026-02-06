import { storage } from "./storage";
import type { StateLaunchConfig } from "@shared/schema";

export const KILL_SWITCH_NAMES = {
  TRIP_REQUESTS: "KILL_TRIP_REQUESTS",
  TRIP_ACCEPTANCE: "KILL_TRIP_ACCEPTANCE",
  INCENTIVES: "KILL_INCENTIVES",
  WALLET_PAYOUTS: "KILL_WALLET_PAYOUTS",
  DRIVER_ONBOARDING: "KILL_DRIVER_ONBOARDING",
  RIDER_ONBOARDING: "KILL_RIDER_ONBOARDING",
} as const;

export type KillSwitchName = typeof KILL_SWITCH_NAMES[keyof typeof KILL_SWITCH_NAMES];

export type SubregionType = "state" | "province" | "region";

interface SubregionDef {
  code: string;
  name: string;
}

interface CountryDef {
  isoCode: string;
  name: string;
  currency: string;
  timezone: string;
  subregionType: SubregionType;
  subregions: SubregionDef[];
}

const COUNTRY_DEFINITIONS: CountryDef[] = [
  {
    isoCode: "NG",
    name: "Nigeria",
    currency: "NGN",
    timezone: "Africa/Lagos",
    subregionType: "state",
    subregions: [
      { code: "EN", name: "Enugu" },
      { code: "LA", name: "Lagos" },
      { code: "AB", name: "Abia" },
      { code: "PH", name: "Rivers" },
      { code: "FC", name: "FCT Abuja" },
      { code: "KN", name: "Kano" },
      { code: "OG", name: "Ogun" },
      { code: "OY", name: "Oyo" },
      { code: "AN", name: "Anambra" },
      { code: "IM", name: "Imo" },
      { code: "DE", name: "Delta" },
      { code: "ED", name: "Edo" },
      { code: "KW", name: "Kwara" },
      { code: "OS", name: "Osun" },
      { code: "ON", name: "Ondo" },
      { code: "EK", name: "Ekiti" },
      { code: "CR", name: "Cross River" },
      { code: "AK", name: "Akwa Ibom" },
      { code: "BE", name: "Benue" },
      { code: "EB", name: "Ebonyi" },
      { code: "KD", name: "Kaduna" },
      { code: "PL", name: "Plateau" },
      { code: "NA", name: "Nasarawa" },
      { code: "NI", name: "Niger" },
      { code: "AD", name: "Adamawa" },
      { code: "BA", name: "Bauchi" },
      { code: "BO", name: "Borno" },
      { code: "GO", name: "Gombe" },
      { code: "JI", name: "Jigawa" },
      { code: "KT", name: "Katsina" },
      { code: "KB", name: "Kebbi" },
      { code: "SO", name: "Sokoto" },
      { code: "TA", name: "Taraba" },
      { code: "YO", name: "Yobe" },
      { code: "ZA", name: "Zamfara" },
      { code: "BY", name: "Bayelsa" },
    ],
  },
  {
    isoCode: "US",
    name: "United States",
    currency: "USD",
    timezone: "America/New_York",
    subregionType: "state",
    subregions: [
      { code: "CA", name: "California" },
      { code: "NY", name: "New York" },
      { code: "TX", name: "Texas" },
      { code: "FL", name: "Florida" },
      { code: "IL", name: "Illinois" },
      { code: "GA", name: "Georgia" },
      { code: "MD", name: "Maryland" },
      { code: "VA", name: "Virginia" },
      { code: "NJ", name: "New Jersey" },
      { code: "PA", name: "Pennsylvania" },
    ],
  },
  {
    isoCode: "ZA",
    name: "South Africa",
    currency: "ZAR",
    timezone: "Africa/Johannesburg",
    subregionType: "province",
    subregions: [
      { code: "GP", name: "Gauteng" },
      { code: "WC", name: "Western Cape" },
      { code: "KZN", name: "KwaZulu-Natal" },
      { code: "EC", name: "Eastern Cape" },
      { code: "FS", name: "Free State" },
      { code: "LP", name: "Limpopo" },
      { code: "MP", name: "Mpumalanga" },
      { code: "NW", name: "North West" },
      { code: "NC", name: "Northern Cape" },
    ],
  },
  {
    isoCode: "GH",
    name: "Ghana",
    currency: "GHS",
    timezone: "Africa/Accra",
    subregionType: "region",
    subregions: [
      { code: "AA", name: "Greater Accra" },
      { code: "AH", name: "Ashanti" },
      { code: "WP", name: "Western" },
      { code: "CP", name: "Central" },
      { code: "EP", name: "Eastern" },
      { code: "VR", name: "Volta" },
      { code: "NR", name: "Northern" },
    ],
  },
  {
    isoCode: "CA",
    name: "Canada",
    currency: "CAD",
    timezone: "America/Toronto",
    subregionType: "province",
    subregions: [
      { code: "ON", name: "Ontario" },
      { code: "QC", name: "Quebec" },
      { code: "BC", name: "British Columbia" },
      { code: "AB", name: "Alberta" },
      { code: "MB", name: "Manitoba" },
      { code: "SK", name: "Saskatchewan" },
    ],
  },
  {
    isoCode: "LR",
    name: "Liberia",
    currency: "LRD",
    timezone: "Africa/Monrovia",
    subregionType: "region",
    subregions: [
      { code: "MO", name: "Montserrado" },
      { code: "MA", name: "Margibi" },
      { code: "NI", name: "Nimba" },
      { code: "BO", name: "Bong" },
      { code: "GB", name: "Grand Bassa" },
    ],
  },
];

export function getCountryDefinitions(): CountryDef[] {
  return COUNTRY_DEFINITIONS;
}

export async function isScopedKillSwitchActive(
  switchName: string,
  countryCode?: string,
  subregionCode?: string
): Promise<boolean> {
  try {
    const globalState = await storage.getScopedKillSwitchState(switchName, "GLOBAL");
    if (globalState?.isActive) return true;

    if (countryCode) {
      const countryState = await storage.getScopedKillSwitchState(switchName, "COUNTRY", countryCode);
      if (countryState?.isActive) return true;
    }

    if (countryCode && subregionCode) {
      const subregionState = await storage.getScopedKillSwitchState(switchName, "SUBREGION", countryCode, subregionCode);
      if (subregionState?.isActive) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function isKillSwitchActive(switchName: string): Promise<boolean> {
  return isScopedKillSwitchActive(switchName);
}

export async function isCountryEnabled(countryCode: string): Promise<boolean> {
  try {
    const country = await storage.getCountryByCode(countryCode);
    return country?.countryEnabled ?? false;
  } catch {
    return false;
  }
}

export async function isStateEnabled(stateCode: string, countryCode: string = "NG"): Promise<boolean> {
  try {
    const config = await storage.getStateLaunchConfig(stateCode, countryCode);
    return config?.stateEnabled ?? false;
  } catch {
    return false;
  }
}

export async function getSystemMode(): Promise<"NORMAL" | "LIMITED" | "EMERGENCY"> {
  try {
    const mode = await storage.getCurrentSystemMode();
    return mode?.currentMode ?? "NORMAL";
  } catch {
    return "NORMAL";
  }
}

export async function getEffectiveSystemMode(countryCode?: string): Promise<"NORMAL" | "LIMITED" | "EMERGENCY"> {
  try {
    const globalMode = await getSystemMode();
    if (globalMode === "EMERGENCY") return "EMERGENCY";

    if (countryCode) {
      const country = await storage.getCountryByCode(countryCode);
      const countryMode = country?.defaultSystemMode as "NORMAL" | "LIMITED" | "EMERGENCY" || "NORMAL";
      if (countryMode === "EMERGENCY") return "EMERGENCY";
      if (countryMode === "LIMITED" && globalMode === "NORMAL") return "LIMITED";
    }

    return globalMode;
  } catch {
    return "NORMAL";
  }
}

export type TripBlockResult = {
  allowed: boolean;
  reason?: string;
  code?: string;
};

export async function checkTripRequestAllowed(
  countryCode: string = "NG",
  stateCode?: string
): Promise<TripBlockResult> {
  if (await isScopedKillSwitchActive(KILL_SWITCH_NAMES.TRIP_REQUESTS, countryCode, stateCode)) {
    return { allowed: false, reason: "Trip requests are temporarily disabled.", code: "KILL_TRIP_REQUESTS" };
  }

  const mode = await getEffectiveSystemMode(countryCode);
  if (mode === "EMERGENCY") {
    return { allowed: false, reason: "System is in emergency mode. No new trips allowed.", code: "EMERGENCY_MODE" };
  }

  if (!(await isCountryEnabled(countryCode))) {
    return { allowed: false, reason: "Service is not yet available in your country.", code: "COUNTRY_DISABLED" };
  }

  if (stateCode) {
    const stateConfig = await storage.getStateLaunchConfig(stateCode, countryCode);
    if (!stateConfig || !stateConfig.stateEnabled) {
      return { allowed: false, reason: "Service is not yet available in your state.", code: "STATE_DISABLED" };
    }

    if (
      stateConfig.currentOnlineDriversCar < stateConfig.minOnlineDriversCar &&
      stateConfig.currentOnlineDriversBike < stateConfig.minOnlineDriversBike
    ) {
      return { allowed: false, reason: "Drivers unavailable in your area. Please try again shortly.", code: "INSUFFICIENT_DRIVERS" };
    }

    const avgWait = parseFloat(String(stateConfig.avgPickupTimeMinutes || 0));
    if (stateConfig.autoDisableOnWaitExceed && avgWait > stateConfig.maxPickupWaitMinutes) {
      return { allowed: false, reason: "Wait times are currently too high. Please try again shortly.", code: "WAIT_TIME_EXCEEDED" };
    }
  }

  return { allowed: true };
}

export async function checkTripAcceptanceAllowed(countryCode?: string): Promise<TripBlockResult> {
  if (await isScopedKillSwitchActive(KILL_SWITCH_NAMES.TRIP_ACCEPTANCE, countryCode)) {
    return { allowed: false, reason: "Trip acceptance is temporarily disabled.", code: "KILL_TRIP_ACCEPTANCE" };
  }

  const mode = await getEffectiveSystemMode(countryCode);
  if (mode === "EMERGENCY") {
    return { allowed: false, reason: "System is in emergency mode. No new trips can be accepted.", code: "EMERGENCY_MODE" };
  }

  return { allowed: true };
}

export async function checkIncentivesAllowed(countryCode?: string): Promise<boolean> {
  try {
    if (await isScopedKillSwitchActive(KILL_SWITCH_NAMES.INCENTIVES, countryCode)) return false;
    const mode = await getEffectiveSystemMode(countryCode);
    if (mode === "LIMITED" || mode === "EMERGENCY") return false;
    return true;
  } catch {
    return false;
  }
}

export async function checkPayoutsAllowed(countryCode?: string): Promise<boolean> {
  try {
    if (await isScopedKillSwitchActive(KILL_SWITCH_NAMES.WALLET_PAYOUTS, countryCode)) return false;
    const mode = await getEffectiveSystemMode(countryCode);
    if (mode === "EMERGENCY") return false;
    return true;
  } catch {
    return false;
  }
}

export async function checkDriverOnboardingAllowed(countryCode?: string): Promise<boolean> {
  try {
    return !(await isScopedKillSwitchActive(KILL_SWITCH_NAMES.DRIVER_ONBOARDING, countryCode));
  } catch {
    return true;
  }
}

export async function checkRiderOnboardingAllowed(countryCode?: string): Promise<boolean> {
  try {
    return !(await isScopedKillSwitchActive(KILL_SWITCH_NAMES.RIDER_ONBOARDING, countryCode));
  } catch {
    return true;
  }
}

export async function getLaunchReadinessStatus(countryCode: string = "NG"): Promise<any> {
  const [country, globalMode, states, allKillSwitches] = await Promise.all([
    storage.getCountryByCode(countryCode),
    storage.getCurrentSystemMode(),
    storage.getStateLaunchConfigsByCountry(countryCode),
    storage.getAllKillSwitchStates(),
  ]);

  const globalSwitches = allKillSwitches.filter(s => s.scope === "GLOBAL");
  const countrySwitches = allKillSwitches.filter(s => s.scope === "COUNTRY" && s.scopeCountryCode === countryCode);
  const subregionSwitches = allKillSwitches.filter(s => s.scope === "SUBREGION" && s.scopeCountryCode === countryCode);

  const activeCount = allKillSwitches.filter(s => s.isActive).length;

  return {
    country: country || null,
    countryEnabled: country?.countryEnabled ?? false,
    systemMode: country?.defaultSystemMode ?? "NORMAL",
    systemModeReason: country?.systemModeReason ?? null,
    globalSystemMode: globalMode?.currentMode ?? "NORMAL",
    globalSystemModeReason: globalMode?.reason ?? null,
    states,
    killSwitches: {
      global: globalSwitches,
      country: countrySwitches,
      subregion: subregionSwitches,
      all: allKillSwitches,
    },
    activeKillSwitchCount: activeCount,
  };
}

export async function seedAllCountries(): Promise<void> {
  for (const def of COUNTRY_DEFINITIONS) {
    const existing = await storage.getCountryByCode(def.isoCode);
    if (!existing) {
      try {
        await storage.createCountry({
          name: def.name,
          isoCode: def.isoCode,
          currency: def.currency,
          timezone: def.timezone,
          active: true,
          countryEnabled: false,
          defaultSystemMode: "NORMAL",
          paymentsEnabled: false,
        } as any);
      } catch (e: any) {
        if (!e.message?.includes("duplicate")) {
          console.error(`Failed to seed country ${def.isoCode}:`, e.message);
        }
      }
    } else {
      if (!existing.countryEnabled && existing.countryEnabled === undefined) {
        await storage.updateCountry(existing.id, { countryEnabled: false });
      }
    }
  }
}

export async function seedSubregions(): Promise<void> {
  for (const def of COUNTRY_DEFINITIONS) {
    for (const sub of def.subregions) {
      const existing = await storage.getStateLaunchConfig(sub.code, def.isoCode);
      if (!existing) {
        await storage.createStateLaunchConfig({
          countryCode: def.isoCode,
          stateCode: sub.code,
          stateName: sub.name,
          subregionType: def.subregionType,
          stateEnabled: false,
          minOnlineDriversCar: 3,
          minOnlineDriversBike: 2,
          minOnlineDriversKeke: 1,
          maxPickupWaitMinutes: 15,
          autoDisableOnWaitExceed: true,
        });
      }
    }
  }
}

export async function seedKillSwitches(): Promise<void> {
  for (const switchName of Object.values(KILL_SWITCH_NAMES)) {
    const existing = await storage.getScopedKillSwitchState(switchName, "GLOBAL");
    if (!existing) {
      await storage.activateScopedKillSwitch(switchName, "GLOBAL", "Initial seed - inactive", "system");
      await storage.deactivateScopedKillSwitch(switchName, "GLOBAL", "system");
    }
  }
}

export async function seedCountryLaunch(): Promise<void> {
  await seedAllCountries();
  await seedSubregions();
  await seedKillSwitches();
}

export { seedSubregions as seedNigeriaStates };

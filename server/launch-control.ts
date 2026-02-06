import { storage } from "./storage";
import type { StateLaunchConfig } from "@shared/schema";

// =============================================
// PHASE 6: LAUNCH READINESS & SAFETY KILL-SWITCHES
// =============================================
// FAIL-SAFE: Missing config → default to SAFE (disabled)
// Kill-switches override incentives, pricing, and matching

export const KILL_SWITCH_NAMES = {
  TRIP_REQUESTS: "KILL_TRIP_REQUESTS",
  TRIP_ACCEPTANCE: "KILL_TRIP_ACCEPTANCE",
  INCENTIVES: "KILL_INCENTIVES",
  WALLET_PAYOUTS: "KILL_WALLET_PAYOUTS",
  DRIVER_ONBOARDING: "KILL_DRIVER_ONBOARDING",
  RIDER_ONBOARDING: "KILL_RIDER_ONBOARDING",
} as const;

export type KillSwitchName = typeof KILL_SWITCH_NAMES[keyof typeof KILL_SWITCH_NAMES];

const NIGERIA_STATES = [
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
];

export async function isKillSwitchActive(switchName: string): Promise<boolean> {
  try {
    const state = await storage.getKillSwitchState(switchName);
    return state?.isActive ?? false;
  } catch {
    return false;
  }
}

export async function isCountryEnabled(countryCode: string): Promise<boolean> {
  try {
    const setting = await storage.getLaunchSetting(`COUNTRY_ENABLED_${countryCode}`);
    return setting?.settingValue ?? false;
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

export type TripBlockResult = {
  allowed: boolean;
  reason?: string;
  code?: string;
};

export async function checkTripRequestAllowed(
  countryCode: string = "NG",
  stateCode?: string
): Promise<TripBlockResult> {
  // 1. Check global kill switch for trip requests
  if (await isKillSwitchActive(KILL_SWITCH_NAMES.TRIP_REQUESTS)) {
    return { allowed: false, reason: "Trip requests are temporarily disabled.", code: "KILL_TRIP_REQUESTS" };
  }

  // 2. Check system mode
  const mode = await getSystemMode();
  if (mode === "EMERGENCY") {
    return { allowed: false, reason: "System is in emergency mode. No new trips allowed.", code: "EMERGENCY_MODE" };
  }

  // 3. Check country enabled
  if (!(await isCountryEnabled(countryCode))) {
    return { allowed: false, reason: "Service is not yet available in your country.", code: "COUNTRY_DISABLED" };
  }

  // 4. Check state enabled (if state code provided)
  if (stateCode) {
    const stateConfig = await storage.getStateLaunchConfig(stateCode, countryCode);
    if (!stateConfig || !stateConfig.stateEnabled) {
      return { allowed: false, reason: "Service is not yet available in your state.", code: "STATE_DISABLED" };
    }

    // 5. Check driver supply thresholds
    if (
      stateConfig.currentOnlineDriversCar < stateConfig.minOnlineDriversCar &&
      stateConfig.currentOnlineDriversBike < stateConfig.minOnlineDriversBike
    ) {
      return { allowed: false, reason: "Drivers unavailable in your area. Please try again shortly.", code: "INSUFFICIENT_DRIVERS" };
    }

    // 6. Check wait time safety
    const avgWait = parseFloat(String(stateConfig.avgPickupTimeMinutes || 0));
    if (stateConfig.autoDisableOnWaitExceed && avgWait > stateConfig.maxPickupWaitMinutes) {
      return { allowed: false, reason: "Wait times are currently too high. Please try again shortly.", code: "WAIT_TIME_EXCEEDED" };
    }
  }

  return { allowed: true };
}

export async function checkTripAcceptanceAllowed(): Promise<TripBlockResult> {
  if (await isKillSwitchActive(KILL_SWITCH_NAMES.TRIP_ACCEPTANCE)) {
    return { allowed: false, reason: "Trip acceptance is temporarily disabled.", code: "KILL_TRIP_ACCEPTANCE" };
  }

  const mode = await getSystemMode();
  if (mode === "EMERGENCY") {
    return { allowed: false, reason: "System is in emergency mode. No new trips can be accepted.", code: "EMERGENCY_MODE" };
  }

  return { allowed: true };
}

export async function checkIncentivesAllowed(): Promise<boolean> {
  try {
    if (await isKillSwitchActive(KILL_SWITCH_NAMES.INCENTIVES)) return false;
    const mode = await getSystemMode();
    if (mode === "LIMITED" || mode === "EMERGENCY") return false;
    return true;
  } catch {
    return false;
  }
}

export async function checkPayoutsAllowed(): Promise<boolean> {
  try {
    if (await isKillSwitchActive(KILL_SWITCH_NAMES.WALLET_PAYOUTS)) return false;
    const mode = await getSystemMode();
    if (mode === "EMERGENCY") return false;
    return true;
  } catch {
    return false;
  }
}

export async function checkDriverOnboardingAllowed(): Promise<boolean> {
  try {
    return !(await isKillSwitchActive(KILL_SWITCH_NAMES.DRIVER_ONBOARDING));
  } catch {
    return true;
  }
}

export async function checkRiderOnboardingAllowed(): Promise<boolean> {
  try {
    return !(await isKillSwitchActive(KILL_SWITCH_NAMES.RIDER_ONBOARDING));
  } catch {
    return true;
  }
}

export async function getLaunchReadinessStatus(countryCode: string = "NG"): Promise<any> {
  const [countryEnabled, mode, states, killSwitches] = await Promise.all([
    isCountryEnabled(countryCode),
    storage.getCurrentSystemMode(),
    storage.getStateLaunchConfigsByCountry(countryCode),
    storage.getAllActiveKillSwitches(),
  ]);

  const allKillSwitches = await storage.getAllKillSwitchStates();

  return {
    countryEnabled,
    systemMode: mode?.currentMode ?? "NORMAL",
    systemModeReason: mode?.reason ?? null,
    states,
    killSwitches: allKillSwitches,
    activeKillSwitchCount: killSwitches.length,
  };
}

export async function seedNigeriaStates(): Promise<void> {
  for (const state of NIGERIA_STATES) {
    const existing = await storage.getStateLaunchConfig(state.code, "NG");
    if (!existing) {
      await storage.createStateLaunchConfig({
        countryCode: "NG",
        stateCode: state.code,
        stateName: state.name,
        stateEnabled: false,
        minOnlineDriversCar: 3,
        minOnlineDriversBike: 2,
        maxPickupWaitMinutes: 15,
        autoDisableOnWaitExceed: true,
      });
    }
  }
}

export async function seedKillSwitches(): Promise<void> {
  for (const switchName of Object.values(KILL_SWITCH_NAMES)) {
    const existing = await storage.getKillSwitchState(switchName);
    if (!existing) {
      await storage.activateKillSwitch(switchName, "Initial seed - inactive", "system");
      await storage.deactivateKillSwitch(switchName, "system");
    }
  }
}

export async function seedCountryLaunch(): Promise<void> {
  const setting = await storage.getLaunchSetting("COUNTRY_ENABLED_NG");
  if (!setting) {
    await storage.setLaunchSetting("COUNTRY_ENABLED_NG", false, "system", "Nigeria country-level launch flag");
  }
}

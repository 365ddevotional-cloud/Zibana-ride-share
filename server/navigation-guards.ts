// =============================================
// PHASE 2: DRIVER GPS & NAVIGATION ENFORCEMENT GUARDS
// =============================================

import { storage } from "./storage";
import {
  NAVIGATION_ENGINE_LOCKED,
  assertNavigationEngineLocked,
  GPS_TIMEOUT_THRESHOLD_SECONDS,
  isGpsHeartbeatValid,
  detectLocationSpoofing,
  generateNavigationDeepLink,
  type NavigationProvider,
} from "@shared/navigation-config";

// Re-export for convenience
export { NAVIGATION_ENGINE_LOCKED, assertNavigationEngineLocked };

// Driver navigation setup validation result
export interface NavigationSetupCheckResult {
  canGoOnline: boolean;
  setupComplete: boolean;
  missingSteps: string[];
  message: string;
}

// GPS validation result
export interface GpsValidationResult {
  isValid: boolean;
  isActive: boolean;
  isSpoofingDetected: boolean;
  spoofingReason?: string;
  lastHeartbeatAge?: number;
  message: string;
}

// Check if driver has completed navigation setup
export async function checkNavigationSetup(userId: string): Promise<NavigationSetupCheckResult> {
  assertNavigationEngineLocked();
  
  const setup = await storage.getDriverNavigationSetup(userId);
  
  if (!setup) {
    return {
      canGoOnline: false,
      setupComplete: false,
      missingSteps: ["all"],
      message: "Navigation setup not started. Complete the Navigation Setup Wizard to go online.",
    };
  }
  
  const missingSteps: string[] = [];
  
  if (!setup.gpsPermissionGranted) {
    missingSteps.push("gps_permission");
  }
  if (!setup.highAccuracyEnabled) {
    missingSteps.push("high_accuracy");
  }
  if (!setup.preferredNavigationProvider) {
    missingSteps.push("navigation_provider");
  }
  if (!setup.backgroundLocationConsent) {
    missingSteps.push("background_location");
  }
  if (!setup.foregroundServiceConsent) {
    missingSteps.push("foreground_service");
  }
  
  if (missingSteps.length > 0) {
    return {
      canGoOnline: false,
      setupComplete: false,
      missingSteps,
      message: `Navigation setup incomplete. Missing: ${missingSteps.join(", ")}`,
    };
  }
  
  return {
    canGoOnline: true,
    setupComplete: setup.navigationSetupCompleted,
    missingSteps: [],
    message: "Navigation setup complete. Driver can go online.",
  };
}

// Check if driver's GPS is currently valid
export async function validateDriverGps(userId: string): Promise<GpsValidationResult> {
  assertNavigationEngineLocked();
  
  const setup = await storage.getDriverNavigationSetup(userId);
  
  if (!setup) {
    return {
      isValid: false,
      isActive: false,
      isSpoofingDetected: false,
      message: "Navigation setup not found.",
    };
  }
  
  if (!setup.isGpsActive) {
    return {
      isValid: false,
      isActive: false,
      isSpoofingDetected: false,
      message: "GPS is not active. Enable GPS to continue.",
    };
  }
  
  // Check heartbeat freshness
  const isHeartbeatValid = isGpsHeartbeatValid(setup.lastGpsHeartbeat);
  
  if (!isHeartbeatValid) {
    const lastHeartbeatAge = setup.lastGpsHeartbeat 
      ? Math.floor((Date.now() - setup.lastGpsHeartbeat.getTime()) / 1000)
      : undefined;
    
    return {
      isValid: false,
      isActive: true,
      isSpoofingDetected: false,
      lastHeartbeatAge,
      message: `GPS heartbeat timeout. Last update: ${lastHeartbeatAge ? `${lastHeartbeatAge}s ago` : "never"} (max: ${GPS_TIMEOUT_THRESHOLD_SECONDS}s)`,
    };
  }
  
  return {
    isValid: true,
    isActive: true,
    isSpoofingDetected: false,
    message: "GPS is active and valid.",
  };
}

// Process GPS location update from driver
export async function processGpsUpdate(
  userId: string,
  latitude: number,
  longitude: number,
  accuracy?: number,
  altitude?: number,
  speed?: number,
  heading?: number,
  deviceTimestamp?: Date
): Promise<{ success: boolean; isSpoofing: boolean; message: string }> {
  assertNavigationEngineLocked();
  
  const setup = await storage.getDriverNavigationSetup(userId);
  
  if (!setup) {
    return { success: false, isSpoofing: false, message: "Navigation setup not found." };
  }
  
  // Check for spoofing if we have previous location
  let isSpoofing = false;
  let spoofingReason: string | undefined;
  
  if (setup.lastKnownLatitude && setup.lastKnownLongitude && setup.lastLocationUpdateAt) {
    const prevLat = parseFloat(setup.lastKnownLatitude);
    const prevLon = parseFloat(setup.lastKnownLongitude);
    const prevTime = setup.lastLocationUpdateAt;
    
    const spoofCheck = detectLocationSpoofing(
      prevLat, prevLon, prevTime,
      latitude, longitude, deviceTimestamp || new Date()
    );
    
    if (spoofCheck.isSpoofing) {
      isSpoofing = true;
      spoofingReason = spoofCheck.reason;
      
      // Log spoofing detection
      await storage.createGpsTrackingLog({
        userId,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        accuracy: accuracy?.toString(),
        altitude: altitude?.toString(),
        speed: speed?.toString(),
        heading: heading?.toString(),
        eventType: "SPOOFING_DETECTED",
        deviceTimestamp: deviceTimestamp || new Date(),
        isSpoofingDetected: true,
        spoofingReason,
      });
      
      // Log audit event
      await storage.createNavigationAuditLog({
        userId,
        actionType: "SPOOFING_DETECTED",
        actionDetails: JSON.stringify({ spoofingReason, latitude, longitude }),
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      });
      
      // Auto-offline the driver
      await triggerAutoOffline(userId, "SPOOFING_DETECTED", spoofingReason);
      
      return { success: false, isSpoofing: true, message: spoofingReason || "Location spoofing detected." };
    }
  }
  
  // Update GPS heartbeat and location
  await storage.updateGpsHeartbeat(userId, latitude.toString(), longitude.toString());
  
  // Log the GPS update
  await storage.createGpsTrackingLog({
    userId,
    tripId: setup.currentNavigationTripId,
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    accuracy: accuracy?.toString(),
    altitude: altitude?.toString(),
    speed: speed?.toString(),
    heading: heading?.toString(),
    eventType: "GPS_ENABLED",
    deviceTimestamp: deviceTimestamp || new Date(),
    isSpoofingDetected: false,
  });
  
  return { success: true, isSpoofing: false, message: "GPS update processed successfully." };
}

// Trigger auto-offline for a driver
export async function triggerAutoOffline(
  userId: string,
  reason: "GPS_DISABLED" | "GPS_TIMEOUT" | "SPOOFING_DETECTED" | "PERMISSION_REVOKED" | "APP_TERMINATED" | "SYSTEM_TIMEOUT",
  details?: string
): Promise<void> {
  assertNavigationEngineLocked();
  
  const setup = await storage.getDriverNavigationSetup(userId);
  
  // Update navigation setup
  await storage.updateDriverNavigationSetup(userId, {
    isGpsActive: false,
    lastOfflineReason: reason,
    lastOfflineAt: new Date(),
  });
  
  // Set driver offline in driverProfiles
  await storage.updateDriverOnlineStatus(userId, false);
  
  // Create interruption record
  await storage.createGpsInterruption({
    userId,
    tripId: setup?.currentNavigationTripId || undefined,
    interruptionReason: reason,
    interruptionDetails: details ? JSON.stringify({ reason: details }) : undefined,
    lastLatitude: setup?.lastKnownLatitude || undefined,
    lastLongitude: setup?.lastKnownLongitude || undefined,
    lastHeartbeatAt: setup?.lastGpsHeartbeat || undefined,
    tripWasAffected: !!setup?.currentNavigationTripId,
    tripMarkedAsInterrupted: !!setup?.currentNavigationTripId,
  });
  
  // Log audit event
  await storage.createNavigationAuditLog({
    userId,
    tripId: setup?.currentNavigationTripId,
    actionType: "AUTO_OFFLINE",
    actionDetails: JSON.stringify({ reason, details }),
    latitude: setup?.lastKnownLatitude,
    longitude: setup?.lastKnownLongitude,
    offlineReason: reason,
  });
  
  console.log(`[NAVIGATION] Auto-offline triggered: userId=${userId}, reason=${reason}`);
}

// Launch navigation for a trip
export async function launchNavigation(
  userId: string,
  tripId: string,
  destLatitude: number,
  destLongitude: number,
  startLatitude?: number,
  startLongitude?: number
): Promise<{ deepLink: string; webFallback: string } | null> {
  assertNavigationEngineLocked();
  
  const setup = await storage.getDriverNavigationSetup(userId);
  
  if (!setup || !setup.preferredNavigationProvider) {
    return null;
  }
  
  const provider = setup.preferredNavigationProvider as NavigationProvider;
  const links = generateNavigationDeepLink(provider, destLatitude, destLongitude, startLatitude, startLongitude);
  
  // Update navigation state
  await storage.setNavigationActive(userId, tripId, true);
  
  // Log navigation launch
  await storage.createNavigationAuditLog({
    userId,
    tripId,
    actionType: "NAVIGATION_LAUNCHED",
    actionDetails: JSON.stringify({ destLatitude, destLongitude, provider }),
    latitude: startLatitude?.toString(),
    longitude: startLongitude?.toString(),
    navigationProvider: provider,
  });
  
  console.log(`[NAVIGATION] Navigation launched: userId=${userId}, tripId=${tripId}, provider=${provider}`);
  
  return links;
}

// Close navigation for a trip
export async function closeNavigation(userId: string, tripId?: string): Promise<void> {
  assertNavigationEngineLocked();
  
  await storage.setNavigationActive(userId, null, false);
  
  await storage.createNavigationAuditLog({
    userId,
    tripId,
    actionType: "NAVIGATION_CLOSED",
    actionDetails: JSON.stringify({ tripId }),
  });
}

// Report app state change (foreground/background)
export async function reportAppState(userId: string, isInForeground: boolean): Promise<void> {
  assertNavigationEngineLocked();
  
  await storage.setAppInForeground(userId, isInForeground);
  
  const actionType = isInForeground ? "APP_RESUMED" : "APP_INTERRUPTED";
  
  await storage.createNavigationAuditLog({
    userId,
    actionType,
    actionDetails: JSON.stringify({ isInForeground }),
  });
  
  // Log GPS event
  const setup = await storage.getDriverNavigationSetup(userId);
  if (setup?.lastKnownLatitude && setup?.lastKnownLongitude) {
    await storage.createGpsTrackingLog({
      userId,
      tripId: setup.currentNavigationTripId,
      latitude: setup.lastKnownLatitude,
      longitude: setup.lastKnownLongitude,
      eventType: isInForeground ? "APP_RESUMED" : "APP_INTERRUPTED",
      deviceTimestamp: new Date(),
      isSpoofingDetected: false,
    });
  }
}

// Check drivers with stale GPS heartbeats and trigger auto-offline
export async function checkStaleGpsHeartbeats(): Promise<number> {
  assertNavigationEngineLocked();
  
  const driversWithIssues = await storage.getDriversWithGpsIssues();
  let offlinedCount = 0;
  
  for (const driver of driversWithIssues) {
    await triggerAutoOffline(driver.userId, "GPS_TIMEOUT", "Heartbeat timeout detected by system check");
    offlinedCount++;
  }
  
  if (offlinedCount > 0) {
    console.log(`[NAVIGATION] Auto-offlined ${offlinedCount} drivers due to GPS timeout`);
  }
  
  return offlinedCount;
}

// Combined check: can driver go online?
export async function canDriverGoOnline(userId: string): Promise<{
  canGoOnline: boolean;
  navigationSetup: NavigationSetupCheckResult;
  gpsStatus: GpsValidationResult | null;
  message: string;
}> {
  assertNavigationEngineLocked();
  
  const navigationSetup = await checkNavigationSetup(userId);
  
  if (!navigationSetup.canGoOnline) {
    return {
      canGoOnline: false,
      navigationSetup,
      gpsStatus: null,
      message: navigationSetup.message,
    };
  }
  
  const gpsStatus = await validateDriverGps(userId);
  
  if (!gpsStatus.isValid) {
    return {
      canGoOnline: false,
      navigationSetup,
      gpsStatus,
      message: gpsStatus.message,
    };
  }
  
  return {
    canGoOnline: true,
    navigationSetup,
    gpsStatus,
    message: "Driver can go online.",
  };
}

// =============================================
// PHASE 2: DRIVER GPS & NAVIGATION ENFORCEMENT CONFIG
// =============================================

// NAVIGATION ENGINE LOCKED - Cannot be removed without code change
export const NAVIGATION_ENGINE_LOCKED = true;

// GPS heartbeat interval (seconds) - server expects updates within this window
export const GPS_HEARTBEAT_INTERVAL_SECONDS = 30;

// GPS timeout threshold (seconds) - auto-offline if no heartbeat received
export const GPS_TIMEOUT_THRESHOLD_SECONDS = 60;

// Location accuracy threshold (meters) - below this may indicate spoofing
export const MIN_LOCATION_ACCURACY_METERS = 20;

// Spoofing detection thresholds
export const SPOOFING_SPEED_THRESHOLD_MS = 150; // ~540 km/h max speed
export const SPOOFING_JUMP_DISTANCE_METERS = 10000; // 10km max jump between updates

// Supported navigation providers
export type NavigationProvider = "google_maps" | "apple_maps" | "waze" | "other";

export interface NavigationProviderConfig {
  id: NavigationProvider;
  name: string;
  deepLinkScheme: string;
  webFallback: string;
}

// Navigation provider configurations
export const NAVIGATION_PROVIDERS: Record<NavigationProvider, NavigationProviderConfig> = {
  google_maps: {
    id: "google_maps",
    name: "Google Maps",
    deepLinkScheme: "comgooglemaps://",
    webFallback: "https://www.google.com/maps/dir/",
  },
  apple_maps: {
    id: "apple_maps",
    name: "Apple Maps",
    deepLinkScheme: "maps://",
    webFallback: "https://maps.apple.com/",
  },
  waze: {
    id: "waze",
    name: "Waze",
    deepLinkScheme: "waze://",
    webFallback: "https://www.waze.com/ul",
  },
  other: {
    id: "other",
    name: "System Default",
    deepLinkScheme: "geo:",
    webFallback: "https://www.google.com/maps/dir/",
  },
};

// Location permission status types
export type LocationPermissionStatus = "not_requested" | "denied" | "foreground_only" | "granted";

// Offline reason types
export type OfflineReason = 
  | "MANUAL" 
  | "GPS_DISABLED" 
  | "GPS_TIMEOUT" 
  | "SPOOFING_DETECTED" 
  | "PERMISSION_REVOKED" 
  | "APP_TERMINATED" 
  | "SYSTEM_TIMEOUT";

// GPS event types
export type GpsEventType = 
  | "GPS_ENABLED" 
  | "GPS_DISABLED" 
  | "GPS_PERMISSION_GRANTED" 
  | "GPS_PERMISSION_DENIED"
  | "SPOOFING_DETECTED" 
  | "HEARTBEAT_TIMEOUT" 
  | "AUTO_OFFLINE_TRIGGERED"
  | "NAVIGATION_LAUNCHED" 
  | "NAVIGATION_CLOSED" 
  | "APP_INTERRUPTED" 
  | "APP_RESUMED";

// Navigation setup step requirements
export interface NavigationSetupRequirements {
  gpsPermissionGranted: boolean;
  highAccuracyEnabled: boolean;
  navigationProviderSelected: boolean;
  backgroundLocationConsent: boolean;
  foregroundServiceConsent: boolean;
}

// Check if all navigation setup requirements are met
export function isNavigationSetupComplete(requirements: NavigationSetupRequirements): boolean {
  return (
    requirements.gpsPermissionGranted &&
    requirements.highAccuracyEnabled &&
    requirements.navigationProviderSelected &&
    requirements.backgroundLocationConsent &&
    requirements.foregroundServiceConsent
  );
}

// Assertion to prevent silent removal of navigation engine
export function assertNavigationEngineLocked(): void {
  if (!NAVIGATION_ENGINE_LOCKED) {
    throw new Error("CRITICAL: Navigation engine is not locked. This is a security violation.");
  }
}

// Generate navigation deep link for pickup/dropoff
export function generateNavigationDeepLink(
  provider: NavigationProvider,
  destLatitude: number,
  destLongitude: number,
  startLatitude?: number,
  startLongitude?: number
): { deepLink: string; webFallback: string } {
  const config = NAVIGATION_PROVIDERS[provider];
  
  let deepLink = "";
  let webFallback = "";
  
  switch (provider) {
    case "google_maps":
      if (startLatitude && startLongitude) {
        deepLink = `comgooglemaps://?saddr=${startLatitude},${startLongitude}&daddr=${destLatitude},${destLongitude}&directionsmode=driving`;
      } else {
        deepLink = `comgooglemaps://?daddr=${destLatitude},${destLongitude}&directionsmode=driving`;
      }
      webFallback = `https://www.google.com/maps/dir/?api=1&destination=${destLatitude},${destLongitude}&travelmode=driving`;
      break;
      
    case "apple_maps":
      if (startLatitude && startLongitude) {
        deepLink = `maps://?saddr=${startLatitude},${startLongitude}&daddr=${destLatitude},${destLongitude}&dirflg=d`;
      } else {
        deepLink = `maps://?daddr=${destLatitude},${destLongitude}&dirflg=d`;
      }
      webFallback = `https://maps.apple.com/?daddr=${destLatitude},${destLongitude}&dirflg=d`;
      break;
      
    case "waze":
      deepLink = `waze://?ll=${destLatitude},${destLongitude}&navigate=yes`;
      webFallback = `https://www.waze.com/ul?ll=${destLatitude},${destLongitude}&navigate=yes`;
      break;
      
    default:
      deepLink = `geo:${destLatitude},${destLongitude}?q=${destLatitude},${destLongitude}`;
      webFallback = `https://www.google.com/maps/dir/?api=1&destination=${destLatitude},${destLongitude}`;
  }
  
  return { deepLink, webFallback };
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Detect potential GPS spoofing based on location jump
export function detectLocationSpoofing(
  prevLat: number, prevLon: number, prevTimestamp: Date,
  newLat: number, newLon: number, newTimestamp: Date
): { isSpoofing: boolean; reason?: string } {
  const distance = calculateDistanceMeters(prevLat, prevLon, newLat, newLon);
  const timeDiff = (newTimestamp.getTime() - prevTimestamp.getTime()) / 1000; // seconds
  
  if (timeDiff <= 0) {
    return { isSpoofing: true, reason: "Invalid timestamp - new location older than previous" };
  }
  
  // Calculate speed in m/s
  const speed = distance / timeDiff;
  
  // Check for unrealistic speed
  if (speed > SPOOFING_SPEED_THRESHOLD_MS) {
    return { 
      isSpoofing: true, 
      reason: `Unrealistic speed detected: ${speed.toFixed(2)} m/s (max: ${SPOOFING_SPEED_THRESHOLD_MS} m/s)` 
    };
  }
  
  // Check for large location jumps
  if (distance > SPOOFING_JUMP_DISTANCE_METERS) {
    return { 
      isSpoofing: true, 
      reason: `Large location jump detected: ${distance.toFixed(2)}m (max: ${SPOOFING_JUMP_DISTANCE_METERS}m)` 
    };
  }
  
  return { isSpoofing: false };
}

// Check if GPS heartbeat is within threshold
export function isGpsHeartbeatValid(lastHeartbeat: Date | null): boolean {
  if (!lastHeartbeat) return false;
  const now = new Date();
  const diff = (now.getTime() - lastHeartbeat.getTime()) / 1000;
  return diff <= GPS_TIMEOUT_THRESHOLD_SECONDS;
}

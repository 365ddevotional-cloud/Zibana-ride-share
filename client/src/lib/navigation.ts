/**
 * Navigation Utilities - Native GPS App Deep Links ONLY
 * NO in-app maps, NO external map SDKs
 * Opens Google Maps on Android/Desktop, Apple Maps on iOS
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export function openNativeNavigation(address: string, lat?: number, lng?: number) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  const encodedAddress = encodeURIComponent(address);
  
  let url: string;
  
  if (lat && lng) {
    if (isIOS) {
      url = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    } else if (isAndroid) {
      url = `geo:${lat},${lng}?q=${lat},${lng}(${encodedAddress})`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  } else {
    if (isIOS) {
      url = `maps://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`;
    } else if (isAndroid) {
      url = `geo:0,0?q=${encodedAddress}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }
  }
  
  window.open(url, "_blank");
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calculate distance between two GPS points using Haversine formula
 * Returns distance in kilometers - NO external APIs
 */
export function haversineDistanceKm(
  point1: Coordinates,
  point2: Coordinates
): number {
  const EARTH_RADIUS_KM = 6371;
  
  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate distance in miles
 */
export function haversineDistanceMiles(
  point1: Coordinates,
  point2: Coordinates
): number {
  return haversineDistanceKm(point1, point2) * 0.621371;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Detect if user is on iOS device
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Detect if user is on Android device
 */
export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

// Navigation provider types for driver setup
export type NavigationProvider = "google_maps" | "apple_maps" | "waze" | "other";

export interface NavigationDeepLink {
  provider: NavigationProvider;
  url: string;
  fallbackUrl: string;
}

export function getNavigationDeepLink(
  provider: NavigationProvider,
  lat: number,
  lng: number,
  label?: string
): NavigationDeepLink {
  const encodedLabel = label ? encodeURIComponent(label) : "";
  
  switch (provider) {
    case "google_maps":
      return {
        provider,
        url: `google.navigation:q=${lat},${lng}`,
        fallbackUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      };
    case "apple_maps":
      return {
        provider,
        url: `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
        fallbackUrl: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
      };
    case "waze":
      return {
        provider,
        url: `waze://?ll=${lat},${lng}&navigate=yes`,
        fallbackUrl: `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      };
    case "other":
    default:
      return {
        provider,
        url: `geo:${lat},${lng}?q=${lat},${lng}`,
        fallbackUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      };
  }
}

export function openNavigationWithProvider(
  provider: NavigationProvider,
  lat: number,
  lng: number,
  label?: string
): void {
  const deepLink = getNavigationDeepLink(provider, lat, lng, label);
  
  const isIOS = isIOSDevice();
  const isAndroid = isAndroidDevice();
  
  if (isAndroid || isIOS) {
    const link = document.createElement("a");
    link.href = deepLink.url;
    link.click();
    
    setTimeout(() => {
      window.open(deepLink.fallbackUrl, "_blank");
    }, 1000);
  } else {
    window.open(deepLink.fallbackUrl, "_blank");
  }
}

export function getTestNavigationUrl(provider: NavigationProvider): string {
  const testLat = 6.5244;
  const testLng = 3.3792;
  const deepLink = getNavigationDeepLink(provider, testLat, testLng, "Test Location");
  
  const isIOS = isIOSDevice();
  const isAndroid = isAndroidDevice();
  
  if (isAndroid || isIOS) {
    return deepLink.url;
  }
  return deepLink.fallbackUrl;
}

export function getNavigationProviderName(provider: NavigationProvider): string {
  switch (provider) {
    case "google_maps":
      return "Google Maps";
    case "apple_maps":
      return "Apple Maps";
    case "waze":
      return "Waze";
    case "other":
    default:
      return "Default GPS";
  }
}

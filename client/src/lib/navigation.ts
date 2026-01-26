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

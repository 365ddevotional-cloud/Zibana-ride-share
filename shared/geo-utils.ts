/**
 * Internal Geo Utilities - NO external APIs
 * Uses Haversine formula for distance calculation
 * All calculations done internally from GPS coordinates
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MILES = 3959;

/**
 * Calculate distance between two GPS points using Haversine formula
 * Returns distance in kilometers
 */
export function haversineDistanceKm(
  point1: Coordinates,
  point2: Coordinates
): number {
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

/**
 * Calculate total distance from a series of GPS points
 * Used for trip distance calculation from sampled coordinates
 */
export function calculateTotalDistanceKm(points: GpsPoint[]): number {
  if (points.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += haversineDistanceKm(
      { lat: points[i - 1].lat, lng: points[i - 1].lng },
      { lat: points[i].lat, lng: points[i].lng }
    );
  }
  
  return totalDistance;
}

/**
 * Calculate total distance in miles
 */
export function calculateTotalDistanceMiles(points: GpsPoint[]): number {
  return calculateTotalDistanceKm(points) * 0.621371;
}

/**
 * Calculate duration between first and last GPS point in minutes
 */
export function calculateDurationMinutes(points: GpsPoint[]): number {
  if (points.length < 2) return 0;
  
  const firstTimestamp = points[0].timestamp;
  const lastTimestamp = points[points.length - 1].timestamp;
  
  return (lastTimestamp - firstTimestamp) / (1000 * 60);
}

/**
 * Detect if vehicle is idle (no significant movement)
 * Returns true if distance moved in the time period is less than threshold
 */
export function isIdle(
  points: GpsPoint[],
  thresholdMeters: number = 50
): boolean {
  if (points.length < 2) return true;
  
  const distanceKm = calculateTotalDistanceKm(points);
  const distanceMeters = distanceKm * 1000;
  
  return distanceMeters < thresholdMeters;
}

/**
 * Calculate average speed in km/h from GPS points
 */
export function calculateAverageSpeedKmh(points: GpsPoint[]): number {
  if (points.length < 2) return 0;
  
  const distanceKm = calculateTotalDistanceKm(points);
  const durationHours = calculateDurationMinutes(points) / 60;
  
  if (durationHours === 0) return 0;
  
  return distanceKm / durationHours;
}

/**
 * Estimate fare based on internal distance and time calculations
 * No external APIs used
 */
export function estimateFare(
  distanceKm: number,
  durationMinutes: number,
  waitingMinutes: number = 0,
  options: {
    baseFare?: number;
    perKmRate?: number;
    perMinuteRate?: number;
    waitingPerMinuteRate?: number;
    minimumFare?: number;
    reservationPremium?: number;
  } = {}
): {
  totalFare: number;
  breakdown: {
    base: number;
    distance: number;
    time: number;
    waiting: number;
    premium: number;
  };
} {
  const {
    baseFare = 2.50,
    perKmRate = 1.20,
    perMinuteRate = 0.25,
    waitingPerMinuteRate = 0.35,
    minimumFare = 5.00,
    reservationPremium = 0,
  } = options;

  const distanceCharge = distanceKm * perKmRate;
  const timeCharge = durationMinutes * perMinuteRate;
  const waitingCharge = waitingMinutes * waitingPerMinuteRate;
  const subtotal = baseFare + distanceCharge + timeCharge + waitingCharge + reservationPremium;
  const totalFare = Math.max(subtotal, minimumFare);

  return {
    totalFare: Math.round(totalFare * 100) / 100,
    breakdown: {
      base: baseFare,
      distance: Math.round(distanceCharge * 100) / 100,
      time: Math.round(timeCharge * 100) / 100,
      waiting: Math.round(waitingCharge * 100) / 100,
      premium: reservationPremium,
    },
  };
}

/**
 * Helper to convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Generate native GPS app deep link URL
 * Opens Google Maps on Android, Apple Maps on iOS
 * NO in-app maps - opens native apps only
 */
export function generateNavigationLink(
  destination: Coordinates,
  label?: string
): {
  googleMaps: string;
  appleMaps: string;
} {
  const encodedLabel = label ? encodeURIComponent(label) : "";
  
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`,
    appleMaps: `http://maps.apple.com/?daddr=${destination.lat},${destination.lng}&dirflg=d${encodedLabel ? `&daddr_name=${encodedLabel}` : ""}`,
  };
}

/**
 * Determine which navigation link to use based on user agent
 */
export function getNavigationUrl(
  destination: Coordinates,
  userAgent: string,
  label?: string
): string {
  const links = generateNavigationLink(destination, label);
  
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  
  return isIOS ? links.appleMaps : links.googleMaps;
}

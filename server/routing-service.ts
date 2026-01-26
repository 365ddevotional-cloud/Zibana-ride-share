/**
 * Routing Service - Uses free OSRM (Open Source Routing Machine) public API
 * for distance and duration calculations.
 * 
 * NOTE: This does NOT render maps in-app. Navigation opens native GPS apps via deep links.
 * OSRM is used only for:
 * - Fare estimation (distance/duration)
 * - ETA calculations for reservations
 * - Recommended departure time calculations
 */

interface RouteResult {
  distanceMeters: number;
  distanceKm: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
  success: boolean;
  error?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const OSRM_BASE_URL = "https://router.project-osrm.org";

/**
 * Calculate route between two points using OSRM public API
 * Returns distance in meters/km/miles and duration in seconds/minutes
 */
export async function calculateRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteResult> {
  try {
    const url = `${OSRM_BASE_URL}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "ZIBA-RideHailing/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    const route = data.routes[0];
    const distanceMeters = route.distance;
    const durationSeconds = route.duration;

    return {
      distanceMeters,
      distanceKm: distanceMeters / 1000,
      distanceMiles: distanceMeters / 1609.34,
      durationSeconds,
      durationMinutes: Math.ceil(durationSeconds / 60),
      success: true,
    };
  } catch (error: any) {
    console.error("Routing calculation error:", error);
    return {
      distanceMeters: 0,
      distanceKm: 0,
      distanceMiles: 0,
      durationSeconds: 0,
      durationMinutes: 0,
      success: false,
      error: error.message || "Failed to calculate route",
    };
  }
}

/**
 * Calculate ETA from current location to destination
 * Adds a buffer for traffic (15% additional time)
 */
export async function calculateETA(
  origin: Coordinates,
  destination: Coordinates,
  trafficBuffer: number = 1.15
): Promise<{ etaMinutes: number; success: boolean; error?: string }> {
  const result = await calculateRoute(origin, destination);
  
  if (!result.success) {
    return { etaMinutes: 0, success: false, error: result.error };
  }

  const adjustedMinutes = Math.ceil(result.durationMinutes * trafficBuffer);
  return { etaMinutes: adjustedMinutes, success: true };
}

/**
 * Calculate recommended departure time for a reservation
 * Returns time driver should leave to arrive 5-10 minutes early
 */
export function calculateRecommendedDepartureTime(
  scheduledPickupAt: Date,
  etaMinutes: number,
  earlyArrivalBuffer: number = 10
): Date {
  const totalMinutesBeforePickup = etaMinutes + earlyArrivalBuffer;
  const departureTime = new Date(scheduledPickupAt);
  departureTime.setMinutes(departureTime.getMinutes() - totalMinutesBeforePickup);
  return departureTime;
}

/**
 * Estimate fare based on distance and duration
 * Base fare + per km rate + per minute rate
 */
export function estimateFare(
  distanceKm: number,
  durationMinutes: number,
  options: {
    baseFare?: number;
    perKmRate?: number;
    perMinuteRate?: number;
    minimumFare?: number;
    reservationPremium?: number;
  } = {}
): { fare: number; breakdown: { base: number; distance: number; time: number; premium: number } } {
  const {
    baseFare = 2.50,
    perKmRate = 1.20,
    perMinuteRate = 0.25,
    minimumFare = 5.00,
    reservationPremium = 0,
  } = options;

  const distanceCharge = distanceKm * perKmRate;
  const timeCharge = durationMinutes * perMinuteRate;
  const subtotal = baseFare + distanceCharge + timeCharge + reservationPremium;
  const fare = Math.max(subtotal, minimumFare);

  return {
    fare: Math.round(fare * 100) / 100,
    breakdown: {
      base: baseFare,
      distance: Math.round(distanceCharge * 100) / 100,
      time: Math.round(timeCharge * 100) / 100,
      premium: reservationPremium,
    },
  };
}

/**
 * Generate deep link URL for native GPS navigation
 * Opens Google Maps on Android/Desktop, Apple Maps on iOS
 */
export function generateNavigationDeepLink(
  destination: Coordinates,
  destinationLabel?: string
): { googleMaps: string; appleMaps: string; universal: string } {
  const label = destinationLabel ? encodeURIComponent(destinationLabel) : "";
  
  const googleMaps = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  
  const appleMaps = `http://maps.apple.com/?daddr=${destination.lat},${destination.lng}&dirflg=d`;
  
  const universal = `geo:${destination.lat},${destination.lng}?q=${destination.lat},${destination.lng}(${label})`;

  return { googleMaps, appleMaps, universal };
}

/**
 * Parse address string to coordinates using free Nominatim geocoding
 * Rate limited - use sparingly
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; success: boolean; error?: string }> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ZIBA-RideHailing/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return { lat: 0, lng: 0, success: false, error: "Address not found" };
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      success: true,
    };
  } catch (error: any) {
    console.error("Geocoding error:", error);
    return { lat: 0, lng: 0, success: false, error: error.message };
  }
}

export const routingService = {
  calculateRoute,
  calculateETA,
  calculateRecommendedDepartureTime,
  estimateFare,
  generateNavigationDeepLink,
  geocodeAddress,
};

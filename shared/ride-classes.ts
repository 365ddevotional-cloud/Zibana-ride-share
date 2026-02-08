export type RideClassId = "go" | "plus" | "comfort" | "elite" | "pet_ride" | "safe_teen";

export interface RideClassPricing {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  surcharge: number;
}

export interface RideClassDefinition {
  id: RideClassId;
  name: string;
  displayName: string;
  description: string;
  fareMultiplier: number;
  pricing: RideClassPricing;
  icon: string;
  color: string;
  bgLight: string;
  bgDark: string;
  minDriverRating: number;
  minVehicleYear: number | null;
  requiresPetApproval: boolean;
  requiresBackgroundCheck: boolean;
  requiresEliteApproval: boolean;
  allowedVehicleTypes: string[];
  maxPassengers: number;
  features: string[];
  sortOrder: number;
  isActive: boolean;
  priorityLevel: number;
}

export const RIDE_CLASSES: Record<RideClassId, RideClassDefinition> = {
  go: {
    id: "go",
    name: "ZIBA Go",
    displayName: "Go",
    description: "Everyday affordable rides",
    fareMultiplier: 1.0,
    pricing: {
      baseFare: 5.00,
      perKmRate: 1.50,
      perMinuteRate: 0.25,
      minimumFare: 5.00,
      surcharge: 0,
    },
    icon: "go",
    color: "#7c3aed",
    bgLight: "rgba(124, 58, 237, 0.10)",
    bgDark: "rgba(124, 58, 237, 0.20)",
    minDriverRating: 0,
    minVehicleYear: null,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    requiresEliteApproval: false,
    allowedVehicleTypes: ["sedan", "hatchback", "suv", "minivan", "any"],
    maxPassengers: 4,
    features: ["Affordable", "Quick pickup", "4 seats"],
    sortOrder: 1,
    isActive: true,
    priorityLevel: 1,
  },
  plus: {
    id: "plus",
    name: "ZIBA Plus",
    displayName: "Plus",
    description: "Larger vehicles with 6-7 seats",
    fareMultiplier: 1.3,
    pricing: {
      baseFare: 7.00,
      perKmRate: 2.00,
      perMinuteRate: 0.35,
      minimumFare: 8.00,
      surcharge: 0,
    },
    icon: "plus",
    color: "#4338ca",
    bgLight: "rgba(67, 56, 202, 0.10)",
    bgDark: "rgba(67, 56, 202, 0.20)",
    minDriverRating: 4.3,
    minVehicleYear: null,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    requiresEliteApproval: false,
    allowedVehicleTypes: ["suv", "minivan", "van"],
    maxPassengers: 7,
    features: ["Larger vehicle", "6-7 seats", "Group trips"],
    sortOrder: 2,
    isActive: true,
    priorityLevel: 2,
  },
  comfort: {
    id: "comfort",
    name: "ZIBA Comfort",
    displayName: "Comfort",
    description: "Newer vehicles, smoother experience",
    fareMultiplier: 1.5,
    pricing: {
      baseFare: 8.00,
      perKmRate: 2.30,
      perMinuteRate: 0.40,
      minimumFare: 10.00,
      surcharge: 0,
    },
    icon: "comfort",
    color: "#0d9488",
    bgLight: "rgba(13, 148, 136, 0.10)",
    bgDark: "rgba(13, 148, 136, 0.20)",
    minDriverRating: 4.5,
    minVehicleYear: 2020,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    requiresEliteApproval: false,
    allowedVehicleTypes: ["sedan", "suv"],
    maxPassengers: 4,
    features: ["Newer vehicles", "Quiet ride", "Temperature control"],
    sortOrder: 3,
    isActive: true,
    priorityLevel: 3,
  },
  pet_ride: {
    id: "pet_ride",
    name: "ZIBA PetRide",
    displayName: "PetRide",
    description: "Pet-friendly vehicles only",
    fareMultiplier: 1.5,
    pricing: {
      baseFare: 7.00,
      perKmRate: 2.00,
      perMinuteRate: 0.35,
      minimumFare: 8.00,
      surcharge: 3.00,
    },
    icon: "pet_ride",
    color: "#ea580c",
    bgLight: "rgba(234, 88, 12, 0.10)",
    bgDark: "rgba(234, 88, 12, 0.20)",
    minDriverRating: 4.3,
    minVehicleYear: null,
    requiresPetApproval: true,
    requiresBackgroundCheck: false,
    requiresEliteApproval: false,
    allowedVehicleTypes: ["sedan", "suv", "minivan"],
    maxPassengers: 3,
    features: ["Pet-friendly driver", "Pet seat cover", "Extra space"],
    sortOrder: 4,
    isActive: true,
    priorityLevel: 3,
  },
  safe_teen: {
    id: "safe_teen",
    name: "ZIBA SafeTeen",
    displayName: "SafeTeen",
    description: "Safe rides with verified drivers for teens",
    fareMultiplier: 1.4,
    pricing: {
      baseFare: 7.50,
      perKmRate: 2.10,
      perMinuteRate: 0.35,
      minimumFare: 9.00,
      surcharge: 2.00,
    },
    icon: "safe_teen",
    color: "#16a34a",
    bgLight: "rgba(22, 163, 74, 0.10)",
    bgDark: "rgba(22, 163, 74, 0.20)",
    minDriverRating: 4.7,
    minVehicleYear: null,
    requiresPetApproval: false,
    requiresBackgroundCheck: true,
    requiresEliteApproval: false,
    allowedVehicleTypes: ["sedan", "suv"],
    maxPassengers: 3,
    features: ["Verified drivers", "Live trip sharing", "Guardian alerts"],
    sortOrder: 5,
    isActive: true,
    priorityLevel: 4,
  },
  elite: {
    id: "elite",
    name: "ZIBA Elite",
    displayName: "Elite",
    description: "Premium vehicles and top-rated drivers",
    fareMultiplier: 2.0,
    pricing: {
      baseFare: 12.00,
      perKmRate: 3.50,
      perMinuteRate: 0.60,
      minimumFare: 15.00,
      surcharge: 0,
    },
    icon: "elite",
    color: "#b45309",
    bgLight: "rgba(180, 83, 9, 0.10)",
    bgDark: "rgba(180, 83, 9, 0.20)",
    minDriverRating: 4.8,
    minVehicleYear: 2022,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    requiresEliteApproval: true,
    allowedVehicleTypes: ["sedan", "suv"],
    maxPassengers: 4,
    features: ["Premium vehicles", "Top-rated drivers", "Complimentary water"],
    sortOrder: 6,
    isActive: true,
    priorityLevel: 5,
  },
};

export const RIDE_CLASS_LIST: RideClassDefinition[] = Object.values(RIDE_CLASSES)
  .filter(rc => rc.isActive)
  .sort((a, b) => a.sortOrder - b.sortOrder);

export function getRideClass(id: RideClassId): RideClassDefinition {
  return RIDE_CLASSES[id];
}

export function getRideClassLabel(id: RideClassId | string): string {
  const rc = RIDE_CLASSES[id as RideClassId];
  return rc?.name || id;
}

export function getRideClassMultiplier(id: RideClassId): number {
  return RIDE_CLASSES[id]?.fareMultiplier ?? 1.0;
}

export function getRideClassPricing(id: RideClassId): RideClassPricing {
  return RIDE_CLASSES[id]?.pricing ?? RIDE_CLASSES.go.pricing;
}

export function isValidRideClass(id: string): id is RideClassId {
  return id in RIDE_CLASSES;
}

export function getDriverEligibleClasses(params: {
  driverRating: number;
  vehicleYear: number | null;
  hasPetApproval: boolean;
  hasBackgroundCheck: boolean;
  hasEliteApproval: boolean;
}): RideClassDefinition[] {
  return RIDE_CLASS_LIST.filter(rc => {
    if (params.driverRating < rc.minDriverRating) return false;
    if (rc.minVehicleYear && (!params.vehicleYear || params.vehicleYear < rc.minVehicleYear)) return false;
    if (rc.requiresPetApproval && !params.hasPetApproval) return false;
    if (rc.requiresBackgroundCheck && !params.hasBackgroundCheck) return false;
    if (rc.requiresEliteApproval && !params.hasEliteApproval) return false;
    return true;
  });
}

export function calculateClassFare(
  rideClassId: RideClassId,
  distanceKm: number,
  durationMin: number
): { fare: number; breakdown: { baseFare: number; distanceFare: number; timeFare: number; surcharge: number; minimumApplied: boolean } } {
  const pricing = getRideClassPricing(rideClassId);
  const baseFare = pricing.baseFare;
  const distanceFare = distanceKm * pricing.perKmRate;
  const timeFare = durationMin * pricing.perMinuteRate;
  const surcharge = pricing.surcharge;
  const rawTotal = baseFare + distanceFare + timeFare + surcharge;
  const minimumApplied = rawTotal < pricing.minimumFare;
  const fare = Math.max(rawTotal, pricing.minimumFare);

  return {
    fare: Math.round(fare * 100) / 100,
    breakdown: {
      baseFare: Math.round(baseFare * 100) / 100,
      distanceFare: Math.round(distanceFare * 100) / 100,
      timeFare: Math.round(timeFare * 100) / 100,
      surcharge: Math.round(surcharge * 100) / 100,
      minimumApplied,
    },
  };
}

export function calculateClassFareRange(
  rideClassId: RideClassId,
  distanceKm: number,
  durationMin: number
): { min: number; max: number; estimate: number; breakdown: { baseFare: number; distanceFare: number; timeFare: number; surcharge: number } } {
  const { fare, breakdown } = calculateClassFare(rideClassId, distanceKm, durationMin);
  const pricing = getRideClassPricing(rideClassId);
  const trafficBuffer = durationMin * 0.3 * 0.35;
  const maxFare = fare + trafficBuffer;

  return {
    min: Math.round(fare * 100) / 100,
    max: Math.round(maxFare * 100) / 100,
    estimate: Math.round(fare * 100) / 100,
    breakdown,
  };
}

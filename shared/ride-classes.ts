export type RideClassId = "go" | "plus" | "comfort" | "elite" | "pet_ride" | "safe_teen";

export interface RideClassDefinition {
  id: RideClassId;
  name: string;
  displayName: string;
  description: string;
  fareMultiplier: number;
  icon: string;
  color: string;
  bgLight: string;
  bgDark: string;
  minDriverRating: number;
  minVehicleYear: number | null;
  requiresPetApproval: boolean;
  requiresBackgroundCheck: boolean;
  requiresEliteApproval: boolean;
  maxPassengers: number;
  features: string[];
  sortOrder: number;
  isActive: boolean;
}

export const RIDE_CLASSES: Record<RideClassId, RideClassDefinition> = {
  go: {
    id: "go",
    name: "ZIBA Go",
    displayName: "Go",
    description: "Everyday affordable rides",
    fareMultiplier: 1.0,
    icon: "go",
    color: "#7c3aed",
    bgLight: "rgba(124, 58, 237, 0.10)",
    bgDark: "rgba(124, 58, 237, 0.20)",
    minDriverRating: 0,
    minVehicleYear: null,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    requiresEliteApproval: false,
    maxPassengers: 4,
    features: ["Affordable", "Quick pickup", "4 seats"],
    sortOrder: 1,
    isActive: true,
  },
  plus: {
    id: "plus",
    name: "ZIBA Plus",
    displayName: "Plus",
    description: "Larger vehicles with 6-7 seats",
    fareMultiplier: 1.3,
    icon: "plus",
    color: "#4338ca",
    bgLight: "rgba(67, 56, 202, 0.10)",
    bgDark: "rgba(67, 56, 202, 0.20)",
    minDriverRating: 4.3,
    minVehicleYear: null,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    requiresEliteApproval: false,
    maxPassengers: 7,
    features: ["Larger vehicle", "6-7 seats", "Group trips"],
    sortOrder: 2,
    isActive: true,
  },
  comfort: {
    id: "comfort",
    name: "ZIBA Comfort",
    displayName: "Comfort",
    description: "Newer vehicles, smoother experience",
    fareMultiplier: 1.5,
    icon: "comfort",
    color: "#0d9488",
    bgLight: "rgba(13, 148, 136, 0.10)",
    bgDark: "rgba(13, 148, 136, 0.20)",
    minDriverRating: 4.5,
    minVehicleYear: 2020,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    requiresEliteApproval: false,
    maxPassengers: 4,
    features: ["Newer vehicles", "Quiet ride", "Temperature control"],
    sortOrder: 3,
    isActive: true,
  },
  pet_ride: {
    id: "pet_ride",
    name: "ZIBA PetRide",
    displayName: "PetRide",
    description: "Pet-friendly vehicles only",
    fareMultiplier: 1.5,
    icon: "pet_ride",
    color: "#ea580c",
    bgLight: "rgba(234, 88, 12, 0.10)",
    bgDark: "rgba(234, 88, 12, 0.20)",
    minDriverRating: 4.3,
    minVehicleYear: null,
    requiresPetApproval: true,
    requiresBackgroundCheck: false,
    requiresEliteApproval: false,
    maxPassengers: 3,
    features: ["Pet-friendly driver", "Pet seat cover", "Extra space"],
    sortOrder: 4,
    isActive: true,
  },
  safe_teen: {
    id: "safe_teen",
    name: "ZIBA SafeTeen",
    displayName: "SafeTeen",
    description: "Safe rides with verified drivers for teens",
    fareMultiplier: 1.4,
    icon: "safe_teen",
    color: "#16a34a",
    bgLight: "rgba(22, 163, 74, 0.10)",
    bgDark: "rgba(22, 163, 74, 0.20)",
    minDriverRating: 4.7,
    minVehicleYear: null,
    requiresPetApproval: false,
    requiresBackgroundCheck: true,
    requiresEliteApproval: false,
    maxPassengers: 3,
    features: ["Verified drivers", "Live trip sharing", "Guardian alerts"],
    sortOrder: 5,
    isActive: true,
  },
  elite: {
    id: "elite",
    name: "ZIBA Elite",
    displayName: "Elite",
    description: "Premium vehicles and top-rated drivers",
    fareMultiplier: 2.0,
    icon: "elite",
    color: "#b45309",
    bgLight: "rgba(180, 83, 9, 0.10)",
    bgDark: "rgba(180, 83, 9, 0.20)",
    minDriverRating: 4.8,
    minVehicleYear: 2022,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    requiresEliteApproval: true,
    maxPassengers: 4,
    features: ["Premium vehicles", "Top-rated drivers", "Complimentary water"],
    sortOrder: 6,
    isActive: true,
  },
};

export const RIDE_CLASS_LIST: RideClassDefinition[] = Object.values(RIDE_CLASSES)
  .filter(rc => rc.isActive)
  .sort((a, b) => a.sortOrder - b.sortOrder);

export function getRideClass(id: RideClassId): RideClassDefinition {
  return RIDE_CLASSES[id];
}

export function getRideClassMultiplier(id: RideClassId): number {
  return RIDE_CLASSES[id]?.fareMultiplier ?? 1.0;
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

export type RideClassId = "go" | "plus" | "comfort" | "elite" | "pet_ride" | "safe_teen";

export interface RideClassDefinition {
  id: RideClassId;
  name: string;
  displayName: string;
  description: string;
  fareMultiplier: number;
  icon: string;
  color: string;
  minDriverRating: number;
  minVehicleYear: number | null;
  requiresPetApproval: boolean;
  requiresBackgroundCheck: boolean;
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
    description: "Affordable everyday rides",
    fareMultiplier: 1.0,
    icon: "car",
    color: "#22c55e",
    minDriverRating: 0,
    minVehicleYear: null,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    maxPassengers: 4,
    features: ["Affordable", "Quick pickup"],
    sortOrder: 1,
    isActive: true,
  },
  plus: {
    id: "plus",
    name: "ZIBA Plus",
    displayName: "Plus",
    description: "Newer cars, top-rated drivers",
    fareMultiplier: 1.3,
    icon: "car-front",
    color: "#3b82f6",
    minDriverRating: 4.5,
    minVehicleYear: 2018,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    maxPassengers: 4,
    features: ["Top-rated drivers", "Newer vehicles"],
    sortOrder: 2,
    isActive: true,
  },
  comfort: {
    id: "comfort",
    name: "ZIBA Comfort",
    displayName: "Comfort",
    description: "Extra legroom, quiet rides",
    fareMultiplier: 1.6,
    icon: "armchair",
    color: "#8b5cf6",
    minDriverRating: 4.7,
    minVehicleYear: 2020,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    maxPassengers: 4,
    features: ["Extra legroom", "Quiet ride", "Temperature control"],
    sortOrder: 3,
    isActive: true,
  },
  elite: {
    id: "elite",
    name: "ZIBA Elite",
    displayName: "Elite",
    description: "Premium luxury experience",
    fareMultiplier: 2.2,
    icon: "crown",
    color: "#f59e0b",
    minDriverRating: 4.8,
    minVehicleYear: 2022,
    requiresPetApproval: false,
    requiresBackgroundCheck: false,
    maxPassengers: 4,
    features: ["Luxury vehicles", "Professional drivers", "Complimentary water"],
    sortOrder: 4,
    isActive: true,
  },
  pet_ride: {
    id: "pet_ride",
    name: "ZIBA PetRide",
    displayName: "PetRide",
    description: "Travel with your furry friend",
    fareMultiplier: 1.4,
    icon: "paw-print",
    color: "#ec4899",
    minDriverRating: 4.3,
    minVehicleYear: null,
    requiresPetApproval: true,
    requiresBackgroundCheck: false,
    maxPassengers: 3,
    features: ["Pet-friendly driver", "Pet seat cover", "Extra space"],
    sortOrder: 5,
    isActive: true,
  },
  safe_teen: {
    id: "safe_teen",
    name: "ZIBA SafeTeen",
    displayName: "SafeTeen",
    description: "Safe rides for younger passengers",
    fareMultiplier: 1.5,
    icon: "shield-check",
    color: "#06b6d4",
    minDriverRating: 4.7,
    minVehicleYear: null,
    requiresPetApproval: false,
    requiresBackgroundCheck: true,
    maxPassengers: 3,
    features: ["Verified drivers", "Live trip sharing", "Guardian alerts"],
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

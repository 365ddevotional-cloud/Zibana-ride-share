import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { Ride } from "@shared/schema";

export type RideStatus = 
  | "requested" 
  | "matching" 
  | "accepted" 
  | "driver_en_route" 
  | "arrived" 
  | "waiting" 
  | "in_progress" 
  | "completed" 
  | "cancelled";

export type RideWithDetails = Ride & {
  riderName?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  driverLicensePlate?: string;
  driverRating?: string;
};

export function useDriverRide() {
  const { toast } = useToast();

  const { data: currentRide, isLoading, refetch } = useQuery<RideWithDetails | null>({
    queryKey: ["/api/rides/driver/current"],
    refetchInterval: 3000,
  });

  const { data: availableRides = [], isLoading: ridesLoading } = useQuery<RideWithDetails[]>({
    queryKey: ["/api/rides/available"],
    refetchInterval: 5000,
  });

  const handleError = (error: Error) => {
    if (isUnauthorizedError(error)) {
      toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
      return;
    }
    toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const acceptRide = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/accept`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/driver/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/available"] });
      toast({ title: "Ride accepted!", description: "Head to the pickup location" });
    },
    onError: handleError,
  });

  const startPickup = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/start-pickup`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/driver/current"] });
      toast({ title: "Pickup started", description: "Navigate to the pickup location" });
    },
    onError: handleError,
  });

  const arrive = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/arrive`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/driver/current"] });
      toast({ title: "Arrived at pickup", description: "Waiting for rider..." });
    },
    onError: handleError,
  });

  const startWaiting = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/start-waiting`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/driver/current"] });
      toast({ title: "Waiting started", description: "Timer is running..." });
    },
    onError: handleError,
  });

  const startTrip = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/start-trip`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/driver/current"] });
      toast({ title: "Trip started", description: "Safe travels!" });
    },
    onError: handleError,
  });

  const completeTrip = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/driver/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      toast({ title: "Trip completed!", description: "Great job!" });
    },
    onError: handleError,
  });

  const cancelRide = useMutation({
    mutationFn: async ({ rideId, reason }: { rideId: string; reason?: string }) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/cancel`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/driver/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/available"] });
      toast({ title: "Ride cancelled" });
    },
    onError: handleError,
  });

  const respondSafetyCheck = useMutation({
    mutationFn: async ({ rideId, response: safetyResponse }: { rideId: string; response: "safe" | "need_help" }) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/safety-response`, { response: safetyResponse });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/driver/current"] });
      toast({ title: "Response recorded" });
    },
    onError: handleError,
  });

  return {
    currentRide,
    availableRides,
    isLoading,
    ridesLoading,
    refetch,
    acceptRide,
    startPickup,
    arrive,
    startWaiting,
    startTrip,
    completeTrip,
    cancelRide,
    respondSafetyCheck,
  };
}

export function useRiderRide() {
  const { toast } = useToast();

  const { data: currentRide, isLoading, refetch } = useQuery<RideWithDetails | null>({
    queryKey: ["/api/rides/rider/current"],
    refetchInterval: 3000,
  });

  const handleError = (error: Error) => {
    if (isUnauthorizedError(error)) {
      toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
      return;
    }
    toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const requestRide = useMutation({
    mutationFn: async (data: { pickupAddress: string; dropoffAddress: string; passengerCount: number; pickupLat?: number; pickupLng?: number; dropoffLat?: number; dropoffLng?: number }) => {
      const response = await apiRequest("POST", "/api/rides/request", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/rider/current"] });
      toast({ title: "Ride requested!", description: "Looking for a driver..." });
    },
    onError: handleError,
  });

  const cancelRide = useMutation({
    mutationFn: async ({ rideId, reason }: { rideId: string; reason?: string }) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/cancel`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/rider/current"] });
      toast({ title: "Ride cancelled" });
    },
    onError: handleError,
  });

  const respondSafetyCheck = useMutation({
    mutationFn: async ({ rideId, response: safetyResponse }: { rideId: string; response: "safe" | "need_help" }) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/safety-response`, { response: safetyResponse });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/rider/current"] });
      toast({ title: "Response recorded" });
    },
    onError: handleError,
  });

  return {
    currentRide,
    isLoading,
    refetch,
    requestRide,
    cancelRide,
    respondSafetyCheck,
  };
}

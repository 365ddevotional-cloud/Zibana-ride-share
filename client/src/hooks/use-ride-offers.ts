import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { isUnauthorizedError } from "@/lib/auth-utils";

export type RideOffer = {
  id: string;
  rideId: string;
  driverId: string;
  status: "pending" | "accepted" | "expired" | "declined";
  offeredAt: string;
  expiresAt: string;
  ride?: {
    pickupAddress?: string | null;
    dropoffAddress?: string | null;
    estimatedFare?: string | null;
    passengerCount?: number | null;
  };
};

export function useRideOffers() {
  const { toast } = useToast();
  const { playSound } = useNotificationSound();
  const previousOfferIdRef = useRef<string | null>(null);

  const { data: pendingOffer, isLoading } = useQuery<RideOffer | null>({
    queryKey: ["/api/ride-offers/pending"],
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (pendingOffer && pendingOffer.id !== previousOfferIdRef.current) {
      playSound("rideOffer");
      previousOfferIdRef.current = pendingOffer.id;
    }
    if (!pendingOffer) {
      previousOfferIdRef.current = null;
    }
  }, [pendingOffer, playSound]);

  const handleError = (error: Error) => {
    if (isUnauthorizedError(error)) {
      toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
      return;
    }
    toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const acceptOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await apiRequest("POST", "/api/ride-offers/accept", { offerId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ride-offers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/driver/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/available"] });
      toast({ title: "Ride accepted!", description: "Head to the pickup location" });
    },
    onError: handleError,
  });

  const declineOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await apiRequest("POST", "/api/ride-offers/decline", { offerId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ride-offers/pending"] });
      toast({ title: "Ride declined", description: "You'll receive other ride offers soon" });
    },
    onError: handleError,
  });

  const hasOffer = !!pendingOffer && pendingOffer.status === "pending";
  const offerExpiresAt = pendingOffer?.expiresAt ? new Date(pendingOffer.expiresAt) : null;

  return {
    pendingOffer,
    hasOffer,
    offerExpiresAt,
    isLoading,
    acceptOffer,
    declineOffer,
  };
}

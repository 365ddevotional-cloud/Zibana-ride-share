import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useToast } from "@/hooks/use-toast";

interface SafetyCheckNotification {
  id: string;
  type: "safety_check" | "idle_alert";
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

interface UseSafetyCheckOptions {
  role: "rider" | "driver";
  currentRideId?: string | null;
}

export function useSafetyCheck({ role, currentRideId }: UseSafetyCheckOptions) {
  const { toast } = useToast();
  const { playSound } = useNotificationSound();
  const [showModal, setShowModal] = useState(false);
  const [pendingCheckId, setPendingCheckId] = useState<string | null>(null);

  const { data: notifications = [] } = useQuery<SafetyCheckNotification[]>({
    queryKey: ["/api/notifications", "safety"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=5", { credentials: "include" });
      if (!res.ok) return [];
      const all = await res.json();
      return all.filter((n: any) => 
        (n.type === "safety_check" || n.type === "idle_alert") && 
        !n.readAt &&
        (!currentRideId || n.referenceId === currentRideId)
      );
    },
    refetchInterval: 5000,
    enabled: !!currentRideId,
  });

  useEffect(() => {
    if (notifications.length > 0 && !showModal) {
      const latestCheck = notifications[0];
      if (latestCheck.id !== pendingCheckId) {
        setPendingCheckId(latestCheck.id);
        playSound("safetyCheck");
        setShowModal(true);
      }
    }
  }, [notifications, showModal, pendingCheckId, playSound]);

  const respondSafe = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/safety-check`, {
        isSafe: true,
        message: `${role} confirmed safe`,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      if (pendingCheckId) {
        apiRequest("POST", `/api/notifications/${pendingCheckId}/mark-read`, {}).catch(() => {});
      }
      toast({ title: "Safety confirmed", description: "Thank you for confirming you're safe" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to record safety response", variant: "destructive" });
    },
  });

  const respondNeedHelp = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("POST", `/api/rides/${rideId}/safety-check`, {
        isSafe: false,
        message: `${role} requested help`,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ 
        title: "Help requested", 
        description: "Support has been notified. They will contact you shortly.", 
        variant: "destructive" 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to request help", variant: "destructive" });
    },
  });

  const handleSafe = useCallback(() => {
    if (currentRideId) {
      respondSafe.mutate(currentRideId);
    }
    setShowModal(false);
  }, [currentRideId, respondSafe]);

  const handleNeedHelp = useCallback(() => {
    if (currentRideId) {
      respondNeedHelp.mutate(currentRideId);
    }
    setShowModal(false);
  }, [currentRideId, respondNeedHelp]);

  return {
    showModal,
    setShowModal,
    handleSafe,
    handleNeedHelp,
    hasPendingSafetyCheck: notifications.length > 0,
    isResponding: respondSafe.isPending || respondNeedHelp.isPending,
  };
}

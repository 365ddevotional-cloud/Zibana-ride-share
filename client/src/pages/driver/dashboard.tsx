import { useEffect, useState, useCallback, useRef } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Power, TrendingUp, Clock, Navigation, Check, MapPin, Settings, User, Bell, Shield, Star, Lightbulb, RefreshCw, X, MessageCircle, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FullPageLoading } from "@/components/loading-spinner";
import { UserAvatar } from "@/components/user-avatar";
import { CancellationWarning } from "@/components/cancellation-warning";
import { BehaviorAdvisory } from "@/components/driver/behavior-advisory";
import { DriverSimulationControls } from "@/components/simulation-ride-controls";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useTranslation } from "@/i18n";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";
import { TripChat } from "@/components/trip-chat";
import { RideRequestOverlay } from "@/components/driver/RideRequestOverlay";
import type { DriverProfile, Trip } from "@shared/schema";

const isDev = import.meta.env.DEV;
const SUPER_ADMIN_EMAIL = "365ddevotional@gmail.com";

function openGoogleMapsNavigation(address: string) {
  const encoded = encodeURIComponent(address);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
}

const MOCK_RIDE: Trip = {
  id: "dev-ride-1",
  riderId: "dev-rider-1",
  driverId: null,
  pickupLocation: "123 Main Street, Houston TX",
  dropoffLocation: "456 Market Ave, Houston TX",
  passengerCount: 1,
  status: "requested",
  fareAmount: "18.50",
  currencyCode: "₦",
  paymentMethod: "WALLET",
  createdAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  pickupLat: "29.7604",
  pickupLng: "-95.3698",
  dropoffLat: "29.7700",
  dropoffLng: "-95.3600",
  driverPayout: null,
  platformFee: null,
  tipAmount: null,
  riderRating: null,
  driverRating: null,
  riderFeedback: null,
  driverFeedback: null,
  countryCode: "NG",
  matchingExpiresAt: null,
  scheduledPickupTime: null,
  isScheduled: false,
  cancellationFeeAmount: null,
  cancellationFeeApplied: false,
  cancellationFeeWaived: false,
  rideClass: "go",
  receiptId: null,
  adminFeePercent: null,
  adminFeeAmount: null,
  totalPaid: null,
} as unknown as Trip;

export default function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const declinedRideIdsRef = useRef<Set<string>>(new Set());
  const [overlayRide, setOverlayRide] = useState<Trip | null>(null);
  const overlayRideIdRef = useRef<string | null>(null);
  const [isOnlineLocal, setIsOnlineLocal] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [simTrip, setSimTrip] = useState<(Trip & { _sim?: boolean }) | null>(null);

  const { data: userRole } = useQuery<{ role: string; roles?: string[] } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    staleTime: 60000,
  });

  const isReturningDriver = typeof window !== "undefined" && localStorage.getItem("zibana-driver-lastLoginAt") !== null;
  const welcomeShown = typeof window !== "undefined" && localStorage.getItem("zibana-driver-welcome-shown") === "true";

  useEffect(() => {
    if (user) {
      localStorage.setItem("zibana-driver-lastLoginAt", new Date().toISOString());
    }
  }, [user?.id]);

  const { data: profile, isLoading: profileLoading } = useQuery<DriverProfile>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (profile && !profileLoaded) {
      setIsOnlineLocal(profile.isOnline);
      setProfileLoaded(true);
    }
  }, [profile, profileLoaded]);

  const { data: availableRides, refetch: refetchRides } = useQuery<Trip[]>({
    queryKey: ["/api/driver/available-rides"],
    enabled: !!user && isOnlineLocal,
    refetchInterval: isOnlineLocal ? 3000 : false,
  });

  const { data: currentTrip } = useQuery<Trip | null>({
    queryKey: ["/api/driver/current-trip"],
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: tripHistory } = useQuery<Trip[]>({
    queryKey: ["/api/driver/trip-history"],
    enabled: !!user,
  });

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const { data: trustProfile } = useQuery<any>({
    queryKey: ["/api/trust/profile"],
    enabled: !!user,
  });

  const { data: coachingAlerts } = useQuery<Array<{
    id: number;
    coachingType: string;
    message: string;
    severity: string;
    isDismissed: boolean;
    createdAt: string;
  }>>({
    queryKey: ["/api/driver/coaching"],
    enabled: !!user,
  });

  const generateCoachingMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/driver/coaching/generate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/coaching"] });
      toast({ title: "Insights Updated", description: "Your support insights have been refreshed." });
    },
  });

  const dismissCoachingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/driver/coaching/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/coaching"] });
    },
  });

  const acceptRideMutationRef = useRef<any>(null);

  const toggleOnlineMutation = useMutation({
    mutationFn: async (newOnlineState: boolean) => {
      const response = await apiRequest("POST", "/api/driver/toggle-online", { isOnline: newOnlineState });
      return response.json();
    },
    onSuccess: (data) => {
      setIsOnlineLocal(data.isOnline);
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      toast({
        title: data.isOnline ? "You're online!" : "You're offline",
        description: data.isOnline 
          ? "You can now receive ride requests" 
          : "You won't receive new ride requests",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const acceptRideMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest("POST", `/api/driver/accept-ride/${tripId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/available-rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
      toast({
        title: "Ride accepted!",
        description: "Navigate to pick up your passenger",
      });
    },
    onError: (error: Error) => {
      if (error.message?.includes("401") || error.message?.toLowerCase().includes("not authenticated")) {
        toast({
          title: "Session expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to accept ride",
        variant: "destructive",
      });
      refetchRides();
    },
  });
  acceptRideMutationRef.current = acceptRideMutation;

  const updateTripStatusMutation = useMutation({
    mutationFn: async ({ tripId, status }: { tripId: string; status: string }) => {
      const response = await apiRequest("POST", `/api/driver/trip/${tripId}/status`, { status });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/trip-history"] });
      const statusMessages: Record<string, string> = {
        in_progress: "Trip started. Drive safely!",
        completed: "Trip completed! Great job.",
      };
      toast({
        title: "Status Updated",
        description: statusMessages[variables.status] || "Trip status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update trip status",
        variant: "destructive",
      });
    },
  });

  const toggleOnlineStatus = useCallback(() => {
    toggleOnlineMutation.mutate(!isOnlineLocal);
  }, [isOnlineLocal, toggleOnlineMutation]);

  const todayTrips = tripHistory?.filter(trip => {
    if (!trip.createdAt) return false;
    const tripDate = new Date(trip.createdAt);
    const today = new Date();
    return tripDate.toDateString() === today.toDateString() && trip.status === "completed";
  }) || [];

  const todayEarnings = todayTrips.reduce((sum, trip) => {
    const driverPayout = trip.driverPayout ? parseFloat(trip.driverPayout) : 0;
    return sum + driverPayout;
  }, 0);

  const todayTips = 0;

  const activeDriverCoaching = coachingAlerts?.filter(c => !c.isDismissed) ?? [];

  const handleDeclineRide = useCallback((tripId: string) => {
    if (tripId.startsWith("dev-")) {
      setOverlayRide(null);
      overlayRideIdRef.current = null;
      return;
    }
    declinedRideIdsRef.current.add(tripId);
    setOverlayRide(null);
    overlayRideIdRef.current = null;
  }, []);

  const handleAcceptFromOverlay = useCallback((tripId: string) => {
    if (tripId.startsWith("dev-")) {
      setOverlayRide(null);
      overlayRideIdRef.current = null;
      setSimTrip({ ...MOCK_RIDE, status: "accepted", _sim: true });
      toast({ title: "[DEV] Ride accepted!", description: "Simulated trip is now active" });
      return;
    }
    acceptRideMutationRef.current?.mutate(tripId);
    setOverlayRide(null);
    overlayRideIdRef.current = null;
  }, [toast]);

  const handleSimulateRide = useCallback(() => {
    setSimTrip(null);
    setOverlayRide({ ...MOCK_RIDE, id: `dev-ride-${Date.now()}` });
  }, []);

  const handleSimTripStatus = useCallback((newStatus: string) => {
    if (!simTrip) return;
    if (newStatus === "in_progress") {
      setSimTrip({ ...simTrip, status: "in_progress" });
      toast({ title: "[DEV] Trip started", description: "Navigate to dropoff location" });
    } else if (newStatus === "completed") {
      setSimTrip(null);
      toast({ title: "[DEV] Trip completed!", description: "Simulation finished" });
    }
  }, [simTrip, toast]);

  useEffect(() => {
    if (currentTrip) {
      if (overlayRideIdRef.current) {
        setOverlayRide(null);
        overlayRideIdRef.current = null;
      }
      return;
    }
    if (!availableRides || availableRides.length === 0) {
      if (overlayRideIdRef.current) {
        setOverlayRide(null);
        overlayRideIdRef.current = null;
      }
      return;
    }
    const declined = declinedRideIdsRef.current;
    const showable = availableRides.filter(r => !declined.has(r.id));

    if (showable.length === 0) {
      if (overlayRideIdRef.current) {
        setOverlayRide(null);
        overlayRideIdRef.current = null;
      }
      return;
    }

    if (!overlayRideIdRef.current) {
      overlayRideIdRef.current = showable[0].id;
      setOverlayRide(showable[0]);
    } else if (!showable.find(r => r.id === overlayRideIdRef.current)) {
      overlayRideIdRef.current = showable[0].id;
      setOverlayRide(showable[0]);
    }
  }, [availableRides, currentTrip]);

  if (profileLoading && !profileLoaded) {
    return <FullPageLoading text="Loading dashboard..." />;
  }

  const isOnline = isOnlineLocal;
  const isApproved = profile?.status === "approved";
  const isRejected = profile?.status === "rejected";
  const isPending = profile?.status === "pending";
  const isSuspended = profile?.status === "suspended";
  const isTraining = profile?.isTraining ?? false;
  const canGoOnline = isApproved || isTraining;

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  const isAdmin = userRole?.roles?.includes("admin") || userRole?.roles?.includes("super_admin") || false;
  const isDriverTrainee = isTraining;
  const showDriverSimulation = isDev && (isSuperAdmin || isAdmin || isDriverTrainee);
  const trustScore = trustProfile?.trustScore ?? 75;
  const trustScoreLevel = trustProfile?.trustScoreLevel ?? "medium";
  const recentNotifications = notifications.slice(0, 3);

  const getTrustColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-500";
  };

  const getTrustBadge = (level: string) => {
    switch (level) {
      case "high": return { label: "Gold Driver", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
      case "medium": return { label: "Silver Driver", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" };
      default: return { label: "New Driver", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
    }
  };

  const tierBadge = getTrustBadge(trustScoreLevel);

  return (
    <DriverLayout>
      <CancellationWarning role="driver" />
      <div className="p-4 space-y-6">
        <DriverSimulationControls />

        {showDriverSimulation && (
          <Card className="border-dashed border-amber-400 dark:border-amber-600" data-testid="card-dev-simulation">
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs">DEV</Badge>
                <span className="text-sm font-medium">Driver Pro Simulation</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                onClick={handleSimulateRide}
                disabled={!!simTrip}
                data-testid="button-simulate-ride"
              >
                Simulate Ride Request
              </Button>
            </CardContent>
          </Card>
        )}

        {isPending && (
          <Card className="border-yellow-300 dark:border-yellow-800" data-testid="card-status-pending">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">Your account is under review</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We are reviewing your application and documents. You will be notified once your account is approved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isRejected && (
          <Card className="border-red-300 dark:border-red-800" data-testid="card-status-rejected">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400">Your application was not approved</p>
                  {(profile as any)?.rejectionReason ? (
                    <p className="text-sm text-muted-foreground mt-1" data-testid="text-rejection-reason">
                      Reason: {(profile as any).rejectionReason}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      Please contact support for more information about your application status.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isSuspended && (
          <Card className="border-orange-300 dark:border-orange-800" data-testid="card-status-suspended">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-orange-700 dark:text-orange-400">Your account is suspended</p>
                  {(profile as any)?.rejectionReason ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reason: {(profile as any).rejectionReason}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      Please contact support for assistance.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar user={{...user, profileImageUrl: (profile as any)?.profilePhoto || user?.profileImageUrl} as any} size="lg" />
            <div>
              <h1 className="text-lg font-bold" data-testid="text-driver-greeting">
                {isReturningDriver && welcomeShown ? "Welcome back, " : "Hello, "}
                {profile?.fullName || user?.firstName || "Driver"}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={tierBadge.className} data-testid="badge-driver-tier">
                  <Star className="h-3 w-3 mr-1" />
                  {tierBadge.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setLocation("/driver/account")}
              data-testid="button-goto-account"
            >
              <User className="h-5 w-5" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setLocation("/driver/settings")}
              data-testid="button-goto-settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Card data-testid="card-trust-score">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Trust Score
              </span>
              <span className={cn("text-2xl font-bold", getTrustColor(trustScore))} data-testid="text-trust-score">
                {trustScore}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div 
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  trustScore >= 80 ? "bg-emerald-500" : trustScore >= 60 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${trustScore}%` }}
                data-testid="gauge-trust-score"
              />
            </div>
          </CardContent>
        </Card>

        {!isOnline && canGoOnline && (
          <div className="flex flex-col items-center gap-4 py-6" data-testid="section-go-online">
            <p className="text-sm text-muted-foreground font-medium">You are currently offline</p>
            <Button
              size="lg"
              className="w-full max-w-xs h-14 rounded-full text-lg font-bold bg-emerald-600 text-white"
              onClick={toggleOnlineStatus}
              disabled={toggleOnlineMutation.isPending}
              data-testid="button-go-online-primary"
            >
              <Power className="h-5 w-5 mr-2" />
              {toggleOnlineMutation.isPending ? "Going online..." : "GO ONLINE"}
            </Button>
            <p className="text-xs text-muted-foreground">Tap to start receiving ride requests</p>
          </div>
        )}

        {(isOnline || !canGoOnline) && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isTraining 
                  ? (isOnline ? "Training Mode Active" : "Training Mode") 
                  : (isOnline ? "You're Online" : "You're Offline")}
              </span>
              <Switch
                checked={isOnline}
                onCheckedChange={() => toggleOnlineStatus()}
                disabled={!canGoOnline || toggleOnlineMutation.isPending}
                data-testid="switch-online-toggle"
              />
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                className={cn(
                  "w-32 h-32 rounded-full text-lg font-semibold transition-all",
                  isOnline 
                    ? "bg-emerald-600 text-white" 
                    : "bg-muted text-foreground"
                )}
                onClick={toggleOnlineStatus}
                disabled={!canGoOnline || toggleOnlineMutation.isPending}
                data-testid="button-toggle-online"
              >
                <div className="flex flex-col items-center gap-2">
                  <Power className="h-8 w-8" />
                  <span>
                    {toggleOnlineMutation.isPending 
                      ? "..." 
                      : isOnline ? t("driver.offline") : t("driver.online")}
                  </span>
                </div>
              </Button>
            </div>

            <div className="flex justify-center">
              <Badge 
                variant={isOnline ? "default" : "secondary"}
                className={isOnline ? "bg-emerald-600" : ""}
                data-testid="badge-online-status"
              >
                {isRejected
                  ? "Application Rejected"
                  : isSuspended
                    ? "Account Suspended"
                    : isPending
                      ? "Pending Approval"
                      : isTraining 
                        ? (isOnline ? "Training Mode" : "Training - Offline")
                        : (isOnline ? "Accepting Rides" : "Not Accepting Rides")}
              </Badge>
            </div>
          </>
        )}

        {isOnline && <BehaviorAdvisory />}

        <div className="grid grid-cols-2 gap-3">
          <Card data-testid="card-today-trips">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Navigation className="h-3 w-3" />
                Trips Today
              </p>
              <p className="text-2xl font-bold mt-1">{todayTrips.length}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-today-earnings">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Earnings Today
              </p>
              <p className="text-2xl font-bold mt-1">
                {"\u20A6"}{todayEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-today-tips">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Star className="h-3 w-3" />
                Tips Earned
              </p>
              <p className="text-2xl font-bold mt-1">
                {"\u20A6"}{todayTips.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-online-time">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Online Time
              </p>
              <p className="text-2xl font-bold mt-1">
                {isOnline ? "Active" : "--"}
              </p>
            </CardContent>
          </Card>
        </div>

        {currentTrip && (
          <Card className="border-emerald-500 border-2" data-testid="card-current-trip">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="h-5 w-5 text-emerald-600" />
                Active Trip
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup</p>
                    <p className="font-medium">{currentTrip.pickupLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dropoff</p>
                    <p className="font-medium">{currentTrip.dropoffLocation}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {currentTrip.status === "accepted" && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openGoogleMapsNavigation(currentTrip.pickupLocation)}
                      data-testid="button-navigate-pickup"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Navigate to Pickup
                    </Button>
                    <Button 
                      className="w-full bg-emerald-600"
                      onClick={() => updateTripStatusMutation.mutate({ 
                        tripId: currentTrip.id, 
                        status: "in_progress" 
                      })}
                      disabled={updateTripStatusMutation.isPending}
                      data-testid="button-start-trip"
                    >
                      Start Trip
                    </Button>
                  </>
                )}
                {currentTrip.status === "in_progress" && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openGoogleMapsNavigation(currentTrip.dropoffLocation)}
                      data-testid="button-navigate-dropoff"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Navigate to Dropoff
                    </Button>
                    <Button 
                      className="w-full bg-emerald-600"
                      onClick={() => updateTripStatusMutation.mutate({ 
                        tripId: currentTrip.id, 
                        status: "completed" 
                      })}
                      disabled={updateTripStatusMutation.isPending}
                      data-testid="button-complete-trip"
                    >
                      Complete Trip
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {showDriverSimulation && simTrip && !currentTrip && (
          <Card className="border-amber-400 border-2" data-testid="card-sim-trip">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="h-5 w-5 text-amber-600" />
                <span>Simulated Trip</span>
                <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs ml-auto">DEV</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup</p>
                    <p className="font-medium">{simTrip.pickupLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dropoff</p>
                    <p className="font-medium">{simTrip.dropoffLocation}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {simTrip.status === "accepted" && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openGoogleMapsNavigation(simTrip.pickupLocation)}
                      data-testid="button-sim-navigate-pickup"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Navigate to Pickup
                    </Button>
                    <Button
                      className="w-full bg-emerald-600"
                      onClick={() => handleSimTripStatus("in_progress")}
                      data-testid="button-sim-start-trip"
                    >
                      Start Trip
                    </Button>
                  </>
                )}
                {simTrip.status === "in_progress" && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openGoogleMapsNavigation(simTrip.dropoffLocation)}
                      data-testid="button-sim-navigate-dropoff"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Navigate to Dropoff
                    </Button>
                    <Button
                      className="w-full bg-emerald-600"
                      onClick={() => handleSimTripStatus("completed")}
                      data-testid="button-sim-complete-trip"
                    >
                      Complete Trip
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setSimTrip(null)}
                  data-testid="button-sim-cancel"
                >
                  Cancel Simulation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isOnline && !currentTrip && availableRides && availableRides.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Incoming Ride Requests
            </h2>
            {availableRides.slice(0, 3).map((ride) => (
              <Card key={ride.id} className="hover-elevate" data-testid={`card-ride-request-${ride.id}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Pickup</p>
                      <p className="font-medium text-sm">{ride.pickupLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Dropoff</p>
                      <p className="font-medium text-sm">{ride.dropoffLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t gap-2">
                    <div>
                      <p className="text-lg font-bold">
                        {ride.currencyCode} {parseFloat(ride.fareAmount || "0").toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      className="bg-emerald-600"
                      onClick={() => acceptRideMutation.mutate(ride.id)}
                      disabled={acceptRideMutation.isPending}
                      data-testid={`button-accept-ride-${ride.id}`}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isOnline && !currentTrip && (!availableRides || availableRides.length === 0) && (
          <Card className="border-dashed" data-testid="card-no-rides">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-medium">Waiting for ride requests</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Stay online to receive incoming requests
              </p>
            </CardContent>
          </Card>
        )}

        {recentNotifications.length > 0 && (
          <Card className="cursor-pointer hover-elevate" onClick={() => setLocation("/driver/inbox")} data-testid="card-notifications">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentNotifications.map((notification: any, idx: number) => (
                <div key={notification.id || idx} className="flex items-start gap-3 text-sm" data-testid={`notification-item-${idx}`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{notification.title || "Notification"}</p>
                    <p className="text-muted-foreground text-xs truncate">{notification.body || notification.message || ""}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {profile && (
          <Card className="cursor-pointer hover-elevate" onClick={() => setLocation("/driver/vehicle")} data-testid="card-driver-info">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Your Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {profile.vehicleMake} {profile.vehicleModel}
              </p>
              <p className="text-sm text-muted-foreground">{profile.licensePlate}</p>
            </CardContent>
          </Card>
        )}
        <Card data-testid="card-driver-coaching">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              ZIBANA Support
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateCoachingMutation.mutate()}
              disabled={generateCoachingMutation.isPending}
              data-testid="button-generate-driver-coaching"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generateCoachingMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {activeDriverCoaching.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3" data-testid="text-no-driver-coaching">
                No support insights right now. Tap Refresh to check for new tips.
              </p>
            ) : (
              <div className="space-y-3">
                {activeDriverCoaching.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0" data-testid={`driver-coaching-${item.id}`}>
                    <div className="flex items-start gap-2 min-w-0">
                      <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <p className="text-sm">{item.message}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => dismissCoachingMutation.mutate(item.id)} data-testid={`button-dismiss-driver-coaching-${item.id}`}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/driver/help")}
                data-testid="button-contact-human-support"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Contact Human Support
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
      {currentTrip && user && (
        <TripChat
          tripId={currentTrip.id}
          tripStatus={currentTrip.status}
          currentUserId={user.id}
          completedAt={currentTrip.completedAt ? String(currentTrip.completedAt) : null}
          cancelledAt={currentTrip.cancelledAt ? String(currentTrip.cancelledAt) : null}
        />
      )}
      <ZibraFloatingButton />
      {overlayRide && !currentTrip && (isOnline || overlayRide.id.startsWith("dev-")) && (
        <RideRequestOverlay
          ride={overlayRide}
          onAccept={handleAcceptFromOverlay}
          onDecline={handleDeclineRide}
          isAccepting={acceptRideMutation.isPending}
          riderName={overlayRide.id.startsWith("dev-") ? "John" : undefined}
          riderRating={overlayRide.id.startsWith("dev-") ? "4.8" : undefined}
        />
      )}
    </DriverLayout>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FullPageLoading } from "@/components/loading-spinner";
import { TripFilterBar } from "@/components/trip-filter-bar";
import { TripDetailModal } from "@/components/trip-detail-modal";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { 
  MapPin, 
  Users, 
  Clock,
  Car,
  Plus,
  LogOut,
  History,
  Navigation,
  CheckCircle,
  XCircle,
  Star,
  User,
  Calendar,
  Shield,
  Award,
  Wallet,
  Lightbulb,
  Gift,
  HandCoins,
  Link2,
  DollarSign
} from "lucide-react";
import { TripChat } from "@/components/trip-chat";
import type { Trip, RiderProfile, Ride } from "@shared/schema";
import { NotificationBell } from "@/components/notification-bell";
import { SupportSection } from "@/components/support-section";
import { RiderRideStatus } from "@/components/ride/rider-ride-status";
import { SafetyCheckModal } from "@/components/ride/safety-check-modal";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";
import { ReservationForm } from "@/components/ride/reservation-form";
import { UpcomingReservations } from "@/components/ride/upcoming-reservations";
import { RiderPaymentMethods } from "@/components/rider-payment-methods";
import { useRiderRide, type RideWithDetails } from "@/hooks/use-ride-lifecycle";
import { useSafetyCheck } from "@/hooks/use-safety-check";
import { SOSButton } from "@/components/ride/sos-button";
import { ShareTripButton } from "@/components/ride/share-trip-button";
import { IncidentReportModal } from "@/components/ride/incident-report-modal";
import { ShareableMomentBanner } from "@/components/shareable-moment-banner";

const rideRequestSchema = z.object({
  pickupLocation: z.string().min(3, "Please enter a pickup location"),
  dropoffLocation: z.string().min(3, "Please enter a dropoff location"),
  passengerCount: z.coerce.number().min(1, "At least 1 passenger").max(8, "Maximum 8 passengers"),
});

type RideRequestForm = z.infer<typeof rideRequestSchema>;

type TripWithDetails = Trip & { riderName?: string; driverName?: string };

export default function RiderDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  
  const [tripStatusFilter, setTripStatusFilter] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");

  const searchParams = new URLSearchParams(window.location.search);
  const urlPaymentMethod = searchParams.get("paymentMethod");
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [tripDetailOpen, setTripDetailOpen] = useState(false);
  const [incidentReportOpen, setIncidentReportOpen] = useState(false);
  const [incidentTripId, setIncidentTripId] = useState("");
  const [incidentAccusedUserId, setIncidentAccusedUserId] = useState("");

  const { data: riderProfile } = useQuery<RiderProfile | null>({
    queryKey: ["/api/rider/profile"],
    enabled: !!user,
  });

  const { data: currentTrip, isLoading: tripLoading } = useQuery<Trip | null>({
    queryKey: ["/api/rider/current-trip"],
    enabled: !!user,
    refetchInterval: 3000,
  });

  const { data: trustScore } = useQuery<any>({
    queryKey: ["/api/rider/trust-score"],
    enabled: !!user,
  });

  const { data: tierBenefits } = useQuery<any>({
    queryKey: ["/api/rider/trust-tier-benefits"],
    enabled: !!user,
  });

  const { data: loyaltyIncentives = [] } = useQuery<any[]>({
    queryKey: ["/api/rider/loyalty-incentives"],
    enabled: !!user,
  });

  const { data: sponsoredBalances = [] } = useQuery<any[]>({
    queryKey: ["/api/funding/sponsored-balance"],
    enabled: !!user,
  });

  const { data: fundingRelationships } = useQuery<any>({
    queryKey: ["/api/funding/relationships"],
    enabled: !!user,
  });

  const { data: funderDashboard = [] } = useQuery<any[]>({
    queryKey: ["/api/funding/dashboard"],
    enabled: !!user,
  });

  // Phase 22 - Enhanced ride lifecycle
  const {
    currentRide,
    requestRide,
    cancelRide: cancelRideAction,
    respondSafetyCheck,
  } = useRiderRide();

  // Phase 23 - Safety check modal
  const {
    showModal: showSafetyModal,
    setShowModal: setShowSafetyModal,
    handleSafe,
    handleNeedHelp,
  } = useSafetyCheck({ role: "rider", currentRideId: currentRide?.id });

  const buildTripQueryParams = () => {
    const params = new URLSearchParams();
    if (tripStatusFilter && tripStatusFilter !== "all") params.append("status", tripStatusFilter);
    if (tripStartDate) params.append("startDate", tripStartDate);
    if (tripEndDate) params.append("endDate", tripEndDate);
    return params.toString();
  };

  const tripQueryParams = buildTripQueryParams();
  const tripQueryKey = tripQueryParams 
    ? `/api/rider/trip-history?${tripQueryParams}` 
    : "/api/rider/trip-history";

  const { data: tripHistory = [], isLoading: historyLoading } = useQuery<TripWithDetails[]>({
    queryKey: ["/api/rider/trip-history", tripStatusFilter, tripStartDate, tripEndDate],
    queryFn: async () => {
      const res = await fetch(tripQueryKey, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trip history");
      return res.json();
    },
    enabled: !!user,
  });

  const clearTripFilters = () => {
    setTripStatusFilter("");
    setTripStartDate("");
    setTripEndDate("");
  };

  const handleTripClick = (trip: TripWithDetails) => {
    setSelectedTrip(trip);
    setTripDetailOpen(true);
  };

  const form = useForm<RideRequestForm>({
    resolver: zodResolver(rideRequestSchema),
    defaultValues: {
      pickupLocation: "",
      dropoffLocation: "",
      passengerCount: 1,
    },
  });

  const requestRideMutation = useMutation({
    mutationFn: async (data: RideRequestForm) => {
      const response = await apiRequest("POST", "/api/rider/request-ride", { ...data, paymentMethod: urlPaymentMethod || "WALLET" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/trip-history"] });
      form.reset();
      setShowRequestForm(false);
      toast({
        title: "Ride requested!",
        description: "Looking for a driver...",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to request ride",
        variant: "destructive",
      });
    },
  });

  const cancelRideMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest("POST", `/api/rider/cancel-ride/${tripId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/trip-history"] });
      toast({
        title: "Ride cancelled",
        description: "Your ride request has been cancelled.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to cancel ride",
        variant: "destructive",
      });
    },
  });

  const fundingActionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await apiRequest("POST", `/api/funding/relationships/${id}/${action}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding/relationships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding/sponsored-balance"] });
      toast({ title: "Success", description: "Funding relationship updated." });
    },
  });

  const onSubmit = (data: RideRequestForm) => {
    requestRideMutation.mutate(data);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading) {
    return <FullPageLoading text="Loading..." />;
  }

  const hasActiveTrip = currentTrip && ["requested", "accepted", "in_progress"].includes(currentTrip.status);
  const hasActiveRide = currentRide && ["requested", "matching", "accepted", "driver_en_route", "arrived", "waiting", "in_progress"].includes(currentRide.status);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Logo />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
            <ProfileDropdown user={user} role="rider" onLogout={logout} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <ShareableMomentBanner />
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-muted-foreground">Where would you like to go today?</p>
          </div>
          {!hasActiveTrip && !hasActiveRide && !showRequestForm && !showReservationForm && (
            <div className="flex gap-2">
              <Button onClick={() => setShowRequestForm(true)} data-testid="button-request-ride">
                <Plus className="h-4 w-4 mr-2" />
                Request Ride
              </Button>
              <Button variant="outline" onClick={() => setShowReservationForm(true)} data-testid="button-schedule-ride">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {showReservationForm && !hasActiveTrip && !hasActiveRide && (
              <ReservationForm 
                onSuccess={() => setShowReservationForm(false)}
                onCancel={() => setShowReservationForm(false)}
              />
            )}

            {showRequestForm && !hasActiveTrip && !hasActiveRide && !showReservationForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-primary" />
                    Request a Ride
                  </CardTitle>
                  <CardDescription>
                    Enter your pickup and dropoff locations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="pickupLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pickup Location</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                                <Input 
                                  placeholder="Enter pickup address" 
                                  className="pl-10" 
                                  data-testid="input-pickup"
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dropoffLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dropoff Location</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                                <Input 
                                  placeholder="Enter dropoff address" 
                                  className="pl-10" 
                                  data-testid="input-dropoff"
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="passengerCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Passengers</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input 
                                  type="number" 
                                  min={1} 
                                  max={8} 
                                  className="pl-10" 
                                  data-testid="input-passengers"
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-3 pt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setShowRequestForm(false)}
                          data-testid="button-cancel-form"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1" 
                          disabled={requestRideMutation.isPending}
                          data-testid="button-submit-request"
                        >
                          {requestRideMutation.isPending ? "Requesting..." : "Request Ride"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Phase 22 - Enhanced Ride Lifecycle */}
            {hasActiveRide && currentRide && (
              <RiderRideStatus
                ride={currentRide}
                onCancel={(rideId, reason) => cancelRideAction.mutate({ rideId, reason })}
                onSafetyResponse={(rideId, response) => respondSafetyCheck.mutate({ rideId, response })}
                isCancelling={cancelRideAction.isPending}
              />
            )}
            
            {/* Legacy current trip fallback */}
            {!hasActiveRide && hasActiveTrip && currentTrip && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    Current Ride
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Trip Status Timeline */}
                  <div className="flex items-center justify-between py-2" data-testid="trip-timeline">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        ["requested", "accepted", "in_progress", "completed"].includes(currentTrip.status)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <Clock className="h-4 w-4" />
                      </div>
                      <span className="text-xs text-muted-foreground">Requested</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 ${
                      ["accepted", "in_progress", "completed"].includes(currentTrip.status)
                        ? "bg-primary" : "bg-muted"
                    }`} />
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        ["accepted", "in_progress", "completed"].includes(currentTrip.status)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <Car className="h-4 w-4" />
                      </div>
                      <span className="text-xs text-muted-foreground">Accepted</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 ${
                      ["in_progress", "completed"].includes(currentTrip.status)
                        ? "bg-primary" : "bg-muted"
                    }`} />
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        ["in_progress", "completed"].includes(currentTrip.status)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <Navigation className="h-4 w-4" />
                      </div>
                      <span className="text-xs text-muted-foreground">In Progress</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 ${
                      currentTrip.status === "completed" ? "bg-primary" : "bg-muted"
                    }`} />
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        currentTrip.status === "completed"
                          ? "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <span className="text-xs text-muted-foreground">Completed</span>
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pickup</p>
                        <p className="font-medium">{currentTrip.pickupLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Dropoff</p>
                        <p className="font-medium">{currentTrip.dropoffLocation}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{currentTrip.passengerCount} passenger(s)</span>
                  </div>
                  
                  {currentTrip.status === "requested" && (
                    <div className="pt-2">
                      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 animate-pulse" />
                        <span>Looking for a driver...</span>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => cancelRideMutation.mutate(currentTrip.id)}
                        disabled={cancelRideMutation.isPending}
                        data-testid="button-cancel-ride"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Request
                      </Button>
                    </div>
                  )}
                  
                  {currentTrip.status === "accepted" && (
                    <div className="pt-2 space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Car className="h-4 w-4 animate-pulse" />
                        <span>Your driver is on the way to pick you up!</span>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => cancelRideMutation.mutate(currentTrip.id)}
                        disabled={cancelRideMutation.isPending}
                        data-testid="button-cancel-ride-accepted"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Ride
                      </Button>
                    </div>
                  )}
                  
                  {currentTrip.status === "in_progress" && (
                    <div className="pt-2 space-y-4">
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <Navigation className="h-4 w-4" />
                        <span>You're on your way to your destination!</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <ShareTripButton tripId={currentTrip.id} />
                        <SOSButton
                          tripId={currentTrip.id}
                          role="rider"
                          riderId={user?.id || ""}
                          driverId={currentTrip.driverId || undefined}
                        />
                      </div>
                    </div>
                  )}

                  {currentTrip.status === "accepted" && user && (
                    <div className="flex items-center justify-end mt-2">
                      <ShareTripButton tripId={currentTrip.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!hasActiveTrip && !hasActiveRide && !showRequestForm && (
              <Card className="hover-elevate cursor-pointer" onClick={() => setShowRequestForm(true)}>
                <CardContent className="flex items-center gap-4 py-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Car className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Need a ride?</h3>
                    <p className="text-sm text-muted-foreground">
                      Tap here to request a ride to your destination
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <RiderPaymentMethods />

            <UpcomingReservations />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Trip History
                </CardTitle>
                <CardDescription>
                  View your past rides and details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TripFilterBar
                  status={tripStatusFilter}
                  onStatusChange={setTripStatusFilter}
                  startDate={tripStartDate}
                  onStartDateChange={setTripStartDate}
                  endDate={tripEndDate}
                  onEndDateChange={setTripEndDate}
                  onClear={clearTripFilters}
                />
                {historyLoading ? (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    Loading trip history...
                  </div>
                ) : tripHistory.length === 0 ? (
                  <EmptyState
                    icon={Car}
                    title="No trips found"
                    description="Try adjusting your filters or take some rides"
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-3">
                    {tripHistory.map((trip) => (
                      <Card 
                        key={trip.id} 
                        className="hover-elevate cursor-pointer"
                        onClick={() => handleTripClick(trip)}
                        data-testid={`trip-history-${trip.id}`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <StatusBadge status={trip.status as any} />
                                {trip.fareAmount && (
                                  <span className="text-sm font-medium">
                                    ${trip.fareAmount}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm truncate">{trip.pickupLocation}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm truncate">{trip.dropoffLocation}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {trip.createdAt 
                                    ? new Date(trip.createdAt).toLocaleDateString() 
                                    : "-"}
                                </span>
                                {trip.driverName && (
                                  <>
                                    <span className="mx-1">-</span>
                                    <Car className="h-3 w-3" />
                                    <span>{trip.driverName}</span>
                                  </>
                                )}
                              </div>
                              {trip.status === "completed" && trip.driverId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIncidentTripId(trip.id);
                                    setIncidentAccusedUserId(trip.driverId || "");
                                    setIncidentReportOpen(true);
                                  }}
                                  data-testid={`button-report-trip-${trip.id}`}
                                >
                                  Report Issue
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserAvatar 
                    user={user} 
                    size="lg"
                  />
                  <div>
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Your Rating</span>
                  <div className="flex items-center gap-1">
                    {riderProfile?.averageRating ? (
                      <>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium" data-testid="text-rider-rating">
                          {parseFloat(riderProfile.averageRating).toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          ({riderProfile.totalRatings} {riderProfile.totalRatings === 1 ? "rating" : "ratings"})
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">No ratings yet</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/rider/safety")}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Trusted Contacts</h3>
                  <p className="text-xs text-muted-foreground">Manage your emergency contacts</p>
                </div>
              </CardContent>
            </Card>

            <SupportSection 
              userTrips={tripHistory.map((t: TripWithDetails) => ({ 
                id: t.id, 
                pickupLocation: t.pickupLocation || "",
                dropoffLocation: t.dropoffLocation || ""
              }))} 
            />
          </div>
        </div>

        {user && (
          <div className="mt-8 space-y-6" data-testid="section-trust-loyalty">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award className="h-5 w-5" />
              Trust & Loyalty
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card data-testid="card-trust-score">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Your Trust Score
                  </CardTitle>
                  <CardDescription>
                    Your overall standing on ZIBA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trustScore ? (
                    <>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <span
                          className={`text-4xl font-bold ${
                            trustScore.tier === "platinum" ? "text-purple-600 dark:text-purple-400" :
                            trustScore.tier === "gold" ? "text-yellow-600 dark:text-yellow-400" :
                            trustScore.tier === "limited" ? "text-destructive" :
                            "text-blue-600 dark:text-blue-400"
                          }`}
                          data-testid="text-trust-score"
                        >
                          {trustScore.score ?? 0}
                        </span>
                        <Badge
                          variant={
                            trustScore.tier === "platinum" ? "default" :
                            trustScore.tier === "gold" ? "secondary" :
                            trustScore.tier === "limited" ? "destructive" :
                            "outline"
                          }
                          data-testid="badge-trust-tier"
                        >
                          {trustScore.tier ? trustScore.tier.charAt(0).toUpperCase() + trustScore.tier.slice(1) : "Standard"}
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-md h-2">
                        <div
                          className={`h-2 rounded-md transition-all ${
                            trustScore.tier === "platinum" ? "bg-purple-600 dark:bg-purple-400" :
                            trustScore.tier === "gold" ? "bg-yellow-600 dark:bg-yellow-400" :
                            trustScore.tier === "limited" ? "bg-destructive" :
                            "bg-blue-600 dark:bg-blue-400"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, trustScore.score ?? 0))}%` }}
                          data-testid="bar-trust-score"
                        />
                      </div>
                      {trustScore.components && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="text-sm" data-testid="text-component-reliability">
                            <span className="text-muted-foreground">Reliability</span>
                            <p className="font-medium">{trustScore.components.reliability ?? 0}/100</p>
                          </div>
                          <div className="text-sm" data-testid="text-component-payment">
                            <span className="text-muted-foreground">Payment</span>
                            <p className="font-medium">{trustScore.components.payment ?? 0}/100</p>
                          </div>
                          <div className="text-sm" data-testid="text-component-conduct">
                            <span className="text-muted-foreground">Conduct</span>
                            <p className="font-medium">{trustScore.components.conduct ?? 0}/100</p>
                          </div>
                          <div className="text-sm" data-testid="text-component-account">
                            <span className="text-muted-foreground">Account</span>
                            <p className="font-medium">{trustScore.components.account ?? 0}/100</p>
                          </div>
                        </div>
                      )}
                      {trustScore.gracePeriodMinutes != null && (
                        <p className="text-sm text-muted-foreground pt-1" data-testid="text-grace-period">
                          Cancellation grace: {trustScore.gracePeriodMinutes} minutes
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Complete a few rides to see your trust score
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-wallet-health">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Wallet Health
                  </CardTitle>
                  <CardDescription>
                    Your payment patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trustScore?.walletFundedPercent != null ? (
                    <>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-sm">
                          Wallet-funded rides: {trustScore.walletFundedPercent}%
                        </span>
                        {trustScore.walletFundedPercent > 50 ? (
                          <Badge variant="secondary" data-testid="badge-wallet-good">Good</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground" data-testid="text-wallet-encourage">
                            Top up your wallet for a smoother experience
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-wallet-no-data">
                      Take some rides to see your wallet health
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground" data-testid="text-wallet-tip">
                    Wallet-funded rides contribute to a smoother experience
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-loyalty-incentives">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Your Benefits
                  </CardTitle>
                  <CardDescription>
                    Rewards and incentives for your loyalty
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loyaltyIncentives.length > 0 ? (
                    loyaltyIncentives.map((incentive: any, index: number) => (
                      <div
                        key={incentive.id || index}
                        className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0"
                        data-testid={`incentive-item-${incentive.id || index}`}
                      >
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs" data-testid={`badge-incentive-type-${incentive.id || index}`}>
                            {incentive.type || "Reward"}
                          </Badge>
                          <p className="text-sm">{incentive.description || "Loyalty benefit"}</p>
                        </div>
                        {incentive.expiresAt && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-incentive-expiry-${incentive.id || index}`}>
                            Expires {new Date(incentive.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-incentives">
                      Keep riding to unlock benefits
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-zibra-tips">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Tips from ZIBRA
                  </CardTitle>
                  <CardDescription>
                    Helpful suggestions for your journey
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trustScore?.tier === "limited" && (
                    <p className="text-sm" data-testid="text-tip-limited">
                      Complete more rides to improve your standing
                    </p>
                  )}
                  {trustScore?.tier === "standard" && (
                    <p className="text-sm" data-testid="text-tip-standard">
                      You're building a solid track record. Keep it up!
                    </p>
                  )}
                  {trustScore?.tier === "gold" && (
                    <p className="text-sm" data-testid="text-tip-gold">
                      You're a valued rider. Enjoy priority matching!
                    </p>
                  )}
                  {trustScore?.tier === "platinum" && (
                    <p className="text-sm" data-testid="text-tip-platinum">
                      Top-tier rider! Thank you for being part of ZIBA
                    </p>
                  )}
                  {!trustScore?.tier && (
                    <p className="text-sm" data-testid="text-tip-default">
                      Start riding with ZIBA and build your trust score
                    </p>
                  )}
                  <Separator />
                  <p className="text-sm text-muted-foreground" data-testid="text-tip-wallet">
                    Use your wallet for faster, smoother payments
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {user && (
          <div className="mt-8 space-y-6" data-testid="section-wallet-funding">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <HandCoins className="h-5 w-5" />
              Wallet Funding
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card data-testid="card-sponsored-funds">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Sponsored Funds
                  </CardTitle>
                  <CardDescription>
                    Funds others have shared with you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sponsoredBalances.length > 0 ? (
                    <>
                      {sponsoredBalances.map((sb: any, index: number) => (
                        <div
                          key={sb.id || index}
                          className="flex items-start justify-between gap-4 py-3 border-b last:border-b-0"
                          data-testid={`sponsored-balance-${sb.id || index}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{sb.funderName || "Funder"}</span>
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-sponsor-type-${sb.id || index}`}>
                                {sb.relationshipType === "parent_child" ? "Parent" :
                                 sb.relationshipType === "spouse_spouse" ? "Spouse" :
                                 sb.relationshipType === "friend_friend" ? "Friend" :
                                 sb.relationshipType === "employer_employee" ? "Employer" :
                                 sb.relationshipType === "organization_member" ? "Organization" :
                                 "Sponsor"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Funds from {sb.funderName || "sponsor"}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-semibold" data-testid={`text-sponsor-balance-${sb.id || index}`}>
                              ${parseFloat(sb.balance || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total: ${parseFloat(sb.totalReceived || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-sponsored-funds">
                      No sponsored funds yet. Others can send you funds through the funding feature.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground pt-2" data-testid="text-sponsored-note">
                    Sponsored funds are used first for rides. They cannot be withdrawn as cash.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-funding-relationships">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Your Funding Links
                  </CardTitle>
                  <CardDescription>
                    Manage your funding connections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">People funding you</h4>
                    {fundingRelationships?.asRecipient?.length > 0 ? (
                      fundingRelationships.asRecipient.map((rel: any, index: number) => (
                        <div
                          key={rel.id || index}
                          className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0"
                          data-testid={`funding-recipient-${rel.id || index}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{rel.funderName || "Funder"}</span>
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-rel-type-r-${rel.id || index}`}>
                                {rel.type === "parent_child" ? "Parent" :
                                 rel.type === "spouse_spouse" ? "Spouse" :
                                 rel.type === "friend_friend" ? "Friend" :
                                 rel.type === "employer_employee" ? "Employer" :
                                 rel.type === "organization_member" ? "Organization" :
                                 "Sponsor"}
                              </Badge>
                              <Badge
                                variant={
                                  rel.status === "pending" ? "outline" :
                                  rel.status === "accepted" ? "default" :
                                  rel.status === "declined" ? "destructive" :
                                  rel.status === "revoked" ? "secondary" :
                                  rel.status === "frozen" ? "destructive" :
                                  "outline"
                                }
                                className="text-xs"
                                data-testid={`badge-rel-status-r-${rel.id || index}`}
                              >
                                {rel.status ? rel.status.charAt(0).toUpperCase() + rel.status.slice(1) : "Unknown"}
                              </Badge>
                            </div>
                            {rel.purpose && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-rel-purpose-${rel.id || index}`}>
                                {rel.purpose}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {rel.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => fundingActionMutation.mutate({ id: rel.id, action: "accept" })}
                                  disabled={fundingActionMutation.isPending}
                                  data-testid={`button-accept-funding-${rel.id || index}`}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fundingActionMutation.mutate({ id: rel.id, action: "decline" })}
                                  disabled={fundingActionMutation.isPending}
                                  data-testid={`button-decline-funding-${rel.id || index}`}
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                            {rel.status === "accepted" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fundingActionMutation.mutate({ id: rel.id, action: "revoke" })}
                                disabled={fundingActionMutation.isPending}
                                data-testid={`button-revoke-funding-${rel.id || index}`}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid="text-no-funders">
                        No one is funding you yet
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">People you fund</h4>
                    {fundingRelationships?.asFunder?.length > 0 ? (
                      fundingRelationships.asFunder.map((rel: any, index: number) => (
                        <div
                          key={rel.id || index}
                          className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0"
                          data-testid={`funding-funder-${rel.id || index}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{rel.recipientName || "Recipient"}</span>
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-rel-type-f-${rel.id || index}`}>
                                {rel.type === "parent_child" ? "Parent" :
                                 rel.type === "spouse_spouse" ? "Spouse" :
                                 rel.type === "friend_friend" ? "Friend" :
                                 rel.type === "employer_employee" ? "Employer" :
                                 rel.type === "organization_member" ? "Organization" :
                                 "Sponsor"}
                              </Badge>
                              <Badge
                                variant={
                                  rel.status === "pending" ? "outline" :
                                  rel.status === "accepted" ? "default" :
                                  rel.status === "declined" ? "destructive" :
                                  rel.status === "revoked" ? "secondary" :
                                  rel.status === "frozen" ? "destructive" :
                                  "outline"
                                }
                                className="text-xs"
                                data-testid={`badge-rel-status-f-${rel.id || index}`}
                              >
                                {rel.status ? rel.status.charAt(0).toUpperCase() + rel.status.slice(1) : "Unknown"}
                              </Badge>
                            </div>
                            {rel.status === "accepted" && rel.totalFunded != null && (
                              <p className="text-xs text-muted-foreground" data-testid={`text-total-funded-${rel.id || index}`}>
                                Total funded: ${parseFloat(rel.totalFunded || 0).toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {rel.status === "accepted" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fundingActionMutation.mutate({ id: rel.id, action: "revoke" })}
                                disabled={fundingActionMutation.isPending}
                                data-testid={`button-revoke-funder-${rel.id || index}`}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid="text-no-recipients">
                        You are not funding anyone yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {fundingRelationships?.asFunder?.some((r: any) => r.status === "accepted") && funderDashboard.length > 0 && (
                <Card className="md:col-span-2" data-testid="card-funder-dashboard">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Your Funded Recipients
                    </CardTitle>
                    <CardDescription>
                      Usage summaries only. No ride routes or driver details are shown.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {funderDashboard.map((entry: any, index: number) => (
                      <div
                        key={entry.recipientId || index}
                        className="flex items-start justify-between gap-4 py-3 border-b last:border-b-0"
                        data-testid={`funder-dashboard-${entry.recipientId || index}`}
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm" data-testid={`text-funded-name-${entry.recipientId || index}`}>
                            {entry.recipientName || "Recipient"}
                          </p>
                          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                            <span data-testid={`text-rides-count-${entry.recipientId || index}`}>
                              Rides taken: {entry.ridesCount ?? 0}
                            </span>
                            <span data-testid={`text-month-funded-${entry.recipientId || index}`}>
                              This month: ${parseFloat(entry.currentMonthFunded || 0).toFixed(2)}
                            </span>
                          </div>
                          {entry.lastFundedAt && (
                            <p className="text-xs text-muted-foreground" data-testid={`text-last-funded-${entry.recipientId || index}`}>
                              Last funded: {new Date(entry.lastFundedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold" data-testid={`text-total-funded-dash-${entry.recipientId || index}`}>
                            ${parseFloat(entry.totalFunded || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Total funded</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
      <TripDetailModal
        trip={selectedTrip}
        open={tripDetailOpen}
        onOpenChange={setTripDetailOpen}
        userRole="rider"
      />
      
      <SafetyCheckModal
        open={showSafetyModal}
        onOpenChange={setShowSafetyModal}
        onSafe={handleSafe}
        onNeedHelp={handleNeedHelp}
        role="rider"
      />

      <IncidentReportModal
        open={incidentReportOpen}
        onOpenChange={setIncidentReportOpen}
        tripId={incidentTripId}
        role="rider"
        accusedUserId={incidentAccusedUserId}
      />
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
    </div>
  );
}

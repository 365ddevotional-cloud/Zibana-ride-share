import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
  Shield
} from "lucide-react";
import type { Trip, RiderProfile, Ride } from "@shared/schema";
import { NotificationBell } from "@/components/notification-bell";
import { SupportSection } from "@/components/support-section";
import { RiderRideStatus } from "@/components/ride/rider-ride-status";
import { SafetyCheckModal } from "@/components/ride/safety-check-modal";
import { ReservationForm } from "@/components/ride/reservation-form";
import { UpcomingReservations } from "@/components/ride/upcoming-reservations";
import { RiderPaymentMethods } from "@/components/rider-payment-methods";
import { useRiderRide, type RideWithDetails } from "@/hooks/use-ride-lifecycle";
import { useSafetyCheck } from "@/hooks/use-safety-check";
import { SOSButton } from "@/components/ride/sos-button";
import { ShareTripButton } from "@/components/ride/share-trip-button";
import { IncidentReportModal } from "@/components/ride/incident-report-modal";

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
      const response = await apiRequest("POST", "/api/rider/request-ride", data);
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
    </div>
  );
}

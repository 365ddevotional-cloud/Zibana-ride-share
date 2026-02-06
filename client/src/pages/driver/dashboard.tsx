import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Power, MapPin, TrendingUp, Clock, Navigation, Check, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FullPageLoading } from "@/components/loading-spinner";
import type { DriverProfile, Trip } from "@shared/schema";
import { CancellationWarning } from "@/components/cancellation-warning";
import { ContextualHelpSuggestion } from "@/components/contextual-help";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<DriverProfile>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: availableRides, refetch: refetchRides } = useQuery<Trip[]>({
    queryKey: ["/api/driver/available-rides"],
    enabled: !!user && profile?.isOnline,
    refetchInterval: profile?.isOnline ? 3000 : false,
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

  const toggleOnlineMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const response = await apiRequest("POST", "/api/driver/toggle-online", { isOnline });
      return response.json();
    },
    onSuccess: (data) => {
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
      toast({
        title: "Error",
        description: error.message || "Failed to accept ride",
        variant: "destructive",
      });
      refetchRides();
    },
  });

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

  const toggleOnlineStatus = () => {
    if (profile) {
      toggleOnlineMutation.mutate(!profile.isOnline);
    }
  };

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

  if (profileLoading) {
    return <FullPageLoading text="Loading dashboard..." />;
  }

  const isOnline = profile?.isOnline ?? false;
  const isApproved = profile?.status === "approved";

  return (
    <DriverLayout>
      <CancellationWarning role="driver" />
      <div className="p-4 space-y-6">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold" data-testid="text-driver-greeting">
            Hello, {profile?.fullName || user?.firstName || "Driver"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {!isApproved 
              ? "Your account is pending approval"
              : isOnline 
                ? "You're online and ready to accept rides" 
                : "Go online to start accepting rides"}
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            className={cn(
              "w-32 h-32 rounded-full text-lg font-semibold transition-all",
              isOnline 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "bg-muted hover:bg-muted/80 text-foreground"
            )}
            onClick={toggleOnlineStatus}
            disabled={!isApproved || toggleOnlineMutation.isPending}
            data-testid="button-toggle-online"
          >
            <div className="flex flex-col items-center gap-2">
              <Power className="h-8 w-8" />
              <span>
                {toggleOnlineMutation.isPending 
                  ? "..." 
                  : isOnline ? "Online" : "Offline"}
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
            {!isApproved 
              ? "Pending Approval" 
              : isOnline ? "Accepting Rides" : "Not Accepting Rides"}
          </Badge>
        </div>

        <ContextualHelpSuggestion
          category="onboarding"
          audience="DRIVER"
          title="Need help getting started?"
          maxArticles={2}
          show={!isApproved}
        />

        <ContextualHelpSuggestion
          category="cancellations"
          audience="DRIVER"
          title="Understanding cancellations"
          maxArticles={2}
          show={isApproved && !isOnline}
        />

        {currentTrip && (
          <Card className="border-emerald-500 border-2" data-testid="card-current-trip">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="h-5 w-5 text-emerald-600" />
                Active Trip
              </CardTitle>
              <CardDescription>
                {currentTrip.status === "accepted" && "Head to pickup location"}
                {currentTrip.status === "in_progress" && "Trip in progress"}
              </CardDescription>
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

              <div className="flex gap-2">
                {currentTrip.status === "accepted" && (
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => updateTripStatusMutation.mutate({ 
                      tripId: currentTrip.id, 
                      status: "in_progress" 
                    })}
                    disabled={updateTripStatusMutation.isPending}
                    data-testid="button-start-trip"
                  >
                    Start Trip
                  </Button>
                )}
                {currentTrip.status === "in_progress" && (
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => updateTripStatusMutation.mutate({ 
                      tripId: currentTrip.id, 
                      status: "completed" 
                    })}
                    disabled={updateTripStatusMutation.isPending}
                    data-testid="button-complete-trip"
                  >
                    Complete Trip
                  </Button>
                )}
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
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="text-lg font-bold">
                        {ride.currencyCode} {parseFloat(ride.fareAmount || "0").toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700"
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

        <div className="grid grid-cols-2 gap-4">
          <Card data-testid="card-today-earnings">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Today's Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ₦{todayEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-today-trips">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today's Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{todayTrips.length}</p>
            </CardContent>
          </Card>
        </div>

        {profile && (
          <Card data-testid="card-driver-info">
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
      </div>
    </DriverLayout>
  );
}

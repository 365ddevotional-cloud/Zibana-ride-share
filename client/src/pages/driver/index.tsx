import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FullPageLoading } from "@/components/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { 
  User, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle,
  Car,
  AlertCircle,
  LogOut
} from "lucide-react";
import type { DriverProfile, Trip } from "@shared/schema";
import { useEffect } from "react";
import { NotificationBell } from "@/components/notification-bell";

type TripWithRider = Trip & { riderName?: string };

export default function DriverDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<DriverProfile>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
  });

  const { data: availableRides = [], isLoading: ridesLoading } = useQuery<TripWithRider[]>({
    queryKey: ["/api/driver/available-rides"],
    enabled: !!user && profile?.status === "approved" && profile?.isOnline,
    refetchInterval: 5000,
  });

  const { data: currentTrip } = useQuery<Trip | null>({
    queryKey: ["/api/driver/current-trip"],
    enabled: !!user && profile?.status === "approved",
    refetchInterval: 3000,
  });

  const toggleOnlineMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const response = await apiRequest("POST", "/api/driver/toggle-online", { isOnline });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      toast({
        title: profile?.isOnline ? "You're now offline" : "You're now online",
        description: profile?.isOnline 
          ? "You won't receive new ride requests" 
          : "You can now receive ride requests",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acceptRideMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest("POST", `/api/driver/accept-ride/${tripId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/available-rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
      toast({ title: "Ride accepted!", description: "Head to the pickup location" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTripStatusMutation = useMutation({
    mutationFn: async ({ tripId, status }: { tripId: string; status: string }) => {
      const response = await apiRequest("POST", `/api/driver/trip/${tripId}/status`, { status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
      if (variables.status === "completed") {
        toast({ title: "Trip completed!", description: "Great job!" });
      } else if (variables.status === "in_progress") {
        toast({ title: "Trip started", description: "Safe travels!" });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || profileLoading) {
    return <FullPageLoading text="Loading dashboard..." />;
  }

  if (!profile) {
    setLocation("/driver/setup");
    return <FullPageLoading text="Redirecting to profile setup..." />;
  }

  const isApproved = profile.status === "approved";
  const isPending = profile.status === "pending";
  const isSuspended = profile.status === "suspended";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Logo />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
            <UserAvatar user={user} size="sm" />
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Driver Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile.fullName}</p>
        </div>

        {isPending && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
            <CardContent className="flex items-start gap-4 pt-6">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Pending Approval</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your driver profile is being reviewed by our team. You'll be able to go online 
                  and accept rides once approved.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isSuspended && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
            <CardContent className="flex items-start gap-4 pt-6">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">Account Suspended</h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Your driver account has been suspended. Please contact support for more information.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={profile.status} />
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{profile.fullName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-right truncate max-w-[150px]">{user?.email || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{profile.phone}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="font-medium">{profile.vehicleMake} {profile.vehicleModel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">License Plate</span>
                    <span className="font-medium">{profile.licensePlate}</span>
                  </div>
                </div>
                <Separator />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation("/driver/profile")}
                  data-testid="button-edit-profile"
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {isApproved && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Availability
                  </CardTitle>
                  <CardDescription>
                    Toggle to start receiving ride requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="online-toggle" className="flex items-center gap-2">
                      <StatusBadge status={profile.isOnline ? "online" : "offline"} />
                    </Label>
                    <Switch
                      id="online-toggle"
                      checked={profile.isOnline}
                      onCheckedChange={(checked) => toggleOnlineMutation.mutate(checked)}
                      disabled={toggleOnlineMutation.isPending}
                      data-testid="switch-availability"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {currentTrip && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    Current Trip
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
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
                    <span className="mx-2">•</span>
                    <StatusBadge status={currentTrip.status as any} />
                  </div>
                  <div className="flex gap-2">
                    {currentTrip.status === "accepted" && (
                      <Button
                        className="flex-1"
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
                        className="flex-1"
                        onClick={() => updateTripStatusMutation.mutate({ 
                          tripId: currentTrip.id, 
                          status: "completed" 
                        })}
                        disabled={updateTripStatusMutation.isPending}
                        data-testid="button-complete-trip"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Trip
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Available Rides
                </CardTitle>
                <CardDescription>
                  {profile.isOnline 
                    ? "Incoming ride requests from riders nearby" 
                    : "Go online to see available rides"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isApproved ? (
                  <EmptyState
                    icon={AlertCircle}
                    title="Approval Required"
                    description="You need to be approved by an admin before you can accept rides"
                  />
                ) : !profile.isOnline ? (
                  <EmptyState
                    icon={Car}
                    title="You're offline"
                    description="Toggle your availability to start receiving ride requests"
                  />
                ) : ridesLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading available rides...
                  </div>
                ) : availableRides.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No rides available"
                    description="New ride requests will appear here automatically"
                  />
                ) : (
                  <div className="space-y-4">
                    {availableRides.map((ride) => (
                      <Card key={ride.id} className="hover-elevate" data-testid={`card-ride-${ride.id}`}>
                        <CardContent className="pt-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{ride.pickupLocation}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{ride.dropoffLocation}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{ride.riderName || "Rider"}</span>
                                <span className="mx-1">•</span>
                                <Users className="h-3 w-3" />
                                <span>{ride.passengerCount} passenger(s)</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => acceptRideMutation.mutate(ride.id)}
                              disabled={acceptRideMutation.isPending || !!currentTrip}
                              data-testid={`button-accept-ride-${ride.id}`}
                            >
                              Accept Ride
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

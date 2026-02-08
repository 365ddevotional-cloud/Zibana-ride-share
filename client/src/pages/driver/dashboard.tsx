import { useState, useEffect } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Power, TrendingUp, Clock, Navigation, Check, MapPin, Settings, User, Bell, Shield, Star, AlertTriangle, Flag } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FullPageLoading } from "@/components/loading-spinner";
import { UserAvatar } from "@/components/user-avatar";
import { CancellationWarning } from "@/components/cancellation-warning";
import { BehaviorAdvisory } from "@/components/driver/behavior-advisory";
import { DriverSimulationControls } from "@/components/simulation-ride-controls";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import type { DriverProfile, Trip } from "@shared/schema";

export default function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [coercionDialogOpen, setCoercionDialogOpen] = useState(false);
  const [coercionDetails, setCoercionDetails] = useState("");
  const [coercionConfirmed, setCoercionConfirmed] = useState(false);
  const [acceptanceDialogOpen, setAcceptanceDialogOpen] = useState(false);

  const isReturningDriver = typeof window !== "undefined" && localStorage.getItem("ziba-driver-lastLoginAt") !== null;
  const welcomeShown = typeof window !== "undefined" && sessionStorage.getItem("ziba-driver-welcome-shown") === "true";

  useEffect(() => {
    if (user) {
      localStorage.setItem("ziba-driver-lastLoginAt", new Date().toISOString());
    }
  }, [user]);

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

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const { data: trustProfile } = useQuery<any>({
    queryKey: ["/api/trust/profile"],
    enabled: !!user,
  });

  const { data: driverFundingAcceptance } = useQuery<{ accepted: boolean }>({
    queryKey: ["/api/director/funding/acceptance"],
    enabled: !!user,
  });

  const acceptFundingTermsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/director/funding/acceptance");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/funding/acceptance"] });
      toast({ title: "Terms Accepted", description: "You have accepted the funding support terms." });
      setAcceptanceDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reportCoercionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/driver/report-coercion", { description: coercionDetails });
    },
    onSuccess: () => {
      toast({ title: "Report Submitted", description: "Your report has been submitted. The director's funding has been paused pending admin review." });
      setCoercionDialogOpen(false);
      setCoercionDetails("");
      setCoercionConfirmed(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
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

  const todayTips = 0;

  if (profileLoading) {
    return <FullPageLoading text="Loading dashboard..." />;
  }

  const isOnline = profile?.isOnline ?? false;
  const isApproved = profile?.status === "approved";
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="lg" />
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
              onClick={() => setLocation("/driver/profile")}
              data-testid="button-goto-profile"
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

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {isOnline ? "You're Online" : "You're Offline"}
          </span>
          <Switch
            checked={isOnline}
            onCheckedChange={() => toggleOnlineStatus()}
            disabled={!isApproved || toggleOnlineMutation.isPending}
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
            disabled={!isApproved || toggleOnlineMutation.isPending}
            data-testid="button-toggle-online"
          >
            <div className="flex flex-col items-center gap-2">
              <Power className="h-8 w-8" />
              <span>
                {toggleOnlineMutation.isPending 
                  ? "..." 
                  : isOnline ? "Go Offline" : "Go Online"}
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
              <div className="flex gap-2">
                {currentTrip.status === "accepted" && (
                  <Button 
                    className="flex-1 bg-emerald-600"
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
                    className="flex-1 bg-emerald-600"
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
          <Card data-testid="card-notifications">
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
        {driverFundingAcceptance && !driverFundingAcceptance.accepted && (
          <Card className="border-dashed" data-testid="card-funding-terms-prompt">
            <CardContent className="flex items-start gap-3 py-4">
              <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Director Funding Support Terms</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You may receive voluntary wallet support from your director. Please review and accept the terms.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setAcceptanceDialogOpen(true)}
                  data-testid="button-review-funding-terms"
                >
                  Review Terms
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-coercion-report">
          <CardContent className="flex items-start gap-3 py-4">
            <Flag className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Report Funding Coercion</p>
              <p className="text-xs text-muted-foreground mt-1">
                If you feel pressured to perform, repay, or comply as a condition for receiving wallet support, you can report it here. All reports are confidential.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setCoercionDialogOpen(true)}
                data-testid="button-report-coercion"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Report Coercion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={coercionDialogOpen} onOpenChange={(open) => { if (!open) { setCoercionDetails(""); setCoercionConfirmed(false); } setCoercionDialogOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Funding Coercion</DialogTitle>
            <DialogDescription>
              If a director is pressuring you to perform, repay, or comply as a condition for wallet support, describe the situation below. Your report is confidential.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={coercionDetails}
              onChange={(e) => setCoercionDetails(e.target.value)}
              placeholder="Describe the situation in detail..."
              rows={4}
              data-testid="input-coercion-details"
            />
            <div className="flex items-start gap-2 p-3 rounded-md border bg-muted/50">
              <Checkbox
                id="coercion-confirm"
                checked={coercionConfirmed}
                onCheckedChange={(checked) => setCoercionConfirmed(checked === true)}
                data-testid="checkbox-coercion-confirm"
              />
              <label htmlFor="coercion-confirm" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                I confirm this report is truthful. I understand that the director's funding ability will be paused pending admin review.
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoercionDialogOpen(false)} data-testid="button-coercion-cancel">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => reportCoercionMutation.mutate()}
              disabled={coercionDetails.trim().length < 10 || !coercionConfirmed || reportCoercionMutation.isPending}
              data-testid="button-coercion-submit"
            >
              {reportCoercionMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={acceptanceDialogOpen} onOpenChange={setAcceptanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Director Funding Support Terms</DialogTitle>
            <DialogDescription>
              Please review and accept the following terms regarding voluntary wallet support.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground p-3 rounded-md border">
            <p><strong>Voluntary Support:</strong> Any wallet funding provided by a Director is voluntary support and does not constitute a loan, wage, salary, advance, or repayment obligation. ZIBA does not guarantee continued funding, activity, or earnings.</p>
            <p><strong>No Coercion:</strong> Directors may not require, imply, or enforce performance, repayment, or compliance as a condition for wallet funding.</p>
            <p><strong>No Obligation:</strong> You are never required to accept funding. Accepting or declining support has no impact on your account standing or earnings.</p>
            <p><strong>Reporting:</strong> If you experience any pressure related to funding, you can report it confidentially through the platform.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptanceDialogOpen(false)} data-testid="button-terms-cancel">Cancel</Button>
            <Button
              onClick={() => acceptFundingTermsMutation.mutate()}
              disabled={acceptFundingTermsMutation.isPending}
              data-testid="button-accept-funding-terms"
            >
              {acceptFundingTermsMutation.isPending ? "Accepting..." : "I Accept These Terms"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DriverLayout>
  );
}

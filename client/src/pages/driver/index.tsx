import { useState, useEffect } from "react";
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
import { TripFilterBar } from "@/components/trip-filter-bar";
import { TripDetailModal } from "@/components/trip-detail-modal";
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
  LogOut,
  History,
  Star,
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Zap,
  Target,
  Award
} from "lucide-react";
import type { DriverProfile, Trip } from "@shared/schema";
import { NotificationBell } from "@/components/notification-bell";

type TripWithRider = Trip & { riderName?: string };

type TripWithDetails = Trip & { riderName?: string; driverName?: string };

type WalletWithTransactions = {
  id: string;
  userId: string;
  balance: string;
  lockedBalance: string;
  currency: string;
  transactions: Array<{
    id: string;
    type: "credit" | "debit" | "hold" | "release";
    amount: string;
    source: string;
    description?: string;
    createdAt: string;
  }>;
  payouts: Array<{
    id: string;
    amount: string;
    status: string;
    method: string;
    createdAt: string;
  }>;
};

type IncentiveEarning = {
  id: string;
  programId: string;
  amount: string;
  status: "pending" | "approved" | "paid" | "revoked";
  earnedAt: string;
  programName?: string;
  programType?: "trip" | "streak" | "peak" | "quality" | "promo";
};

export default function DriverDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [tripStatusFilter, setTripStatusFilter] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [tripDetailOpen, setTripDetailOpen] = useState(false);

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

  const buildTripQueryParams = () => {
    const params = new URLSearchParams();
    if (tripStatusFilter && tripStatusFilter !== "all") params.append("status", tripStatusFilter);
    if (tripStartDate) params.append("startDate", tripStartDate);
    if (tripEndDate) params.append("endDate", tripEndDate);
    return params.toString();
  };

  const tripQueryParams = buildTripQueryParams();
  const tripQueryKey = tripQueryParams 
    ? `/api/driver/trip-history?${tripQueryParams}` 
    : "/api/driver/trip-history";

  const { data: tripHistory = [], isLoading: historyLoading } = useQuery<TripWithDetails[]>({
    queryKey: ["/api/driver/trip-history", tripStatusFilter, tripStartDate, tripEndDate],
    queryFn: async () => {
      const res = await fetch(tripQueryKey, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trip history");
      return res.json();
    },
    enabled: !!user,
  });

  // Phase 11 - Wallet query
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletWithTransactions | null>({
    queryKey: ["/api/wallets/me"],
    enabled: !!user,
  });

  // Phase 14 - Incentive earnings query
  const { data: incentiveEarnings = [], isLoading: incentivesLoading } = useQuery<IncentiveEarning[]>({
    queryKey: ["/api/incentives/earnings/mine"],
    queryFn: async () => {
      const res = await fetch("/api/incentives/earnings/mine", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !!profile?.id,
  });

  const totalIncentiveEarned = incentiveEarnings
    .filter(e => e.status === "paid")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const pendingIncentives = incentiveEarnings
    .filter(e => e.status === "pending" || e.status === "approved");

  const clearTripFilters = () => {
    setTripStatusFilter("");
    setTripStartDate("");
    setTripEndDate("");
  };

  const handleTripClick = (trip: TripWithDetails) => {
    setSelectedTrip(trip);
    setTripDetailOpen(true);
  };

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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      {profile.averageRating ? (
                        <>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium" data-testid="text-average-rating">
                            {parseFloat(profile.averageRating).toFixed(1)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            ({profile.totalRatings} {profile.totalRatings === 1 ? "rating" : "ratings"})
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No ratings yet</span>
                      )}
                    </div>
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

            {/* Phase 11 - Wallet Section */}
            {profile.status === "approved" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Earnings Wallet
                  </CardTitle>
                  <CardDescription>
                    Your earnings from completed trips
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {walletLoading ? (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      Loading wallet...
                    </div>
                  ) : !wallet ? (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      No wallet yet. Complete trips to earn!
                    </div>
                  ) : (
                    <>
                      <div className="bg-primary/10 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Available Balance</div>
                        <div className="text-2xl font-bold text-primary" data-testid="text-wallet-balance">
                          ${(parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance)).toFixed(2)}
                        </div>
                        {parseFloat(wallet.lockedBalance) > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            ${wallet.lockedBalance} pending payout
                          </div>
                        )}
                      </div>
                      
                      {wallet.transactions.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Recent Transactions</div>
                          <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {wallet.transactions.slice(0, 5).map((tx) => (
                              <div 
                                key={tx.id} 
                                className="flex items-center justify-between py-2 border-b last:border-0"
                                data-testid={`row-transaction-${tx.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  {tx.type === "credit" ? (
                                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                                  )}
                                  <div>
                                    <div className="text-sm font-medium capitalize">{tx.source}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                      {tx.description || tx.type}
                                    </div>
                                  </div>
                                </div>
                                <div className={`text-sm font-medium ${
                                  tx.type === "credit" ? "text-green-600" : "text-red-600"
                                }`}>
                                  {tx.type === "credit" ? "+" : "-"}${tx.amount}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {wallet.payouts.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Recent Payouts</div>
                          <div className="space-y-1">
                            {wallet.payouts.slice(0, 3).map((payout) => (
                              <div 
                                key={payout.id} 
                                className="flex items-center justify-between py-2 border-b last:border-0"
                                data-testid={`row-payout-${payout.id}`}
                              >
                                <div>
                                  <div className="text-sm font-medium">${payout.amount}</div>
                                  <div className="text-xs text-muted-foreground capitalize">
                                    {payout.method} - {new Date(payout.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                                <StatusBadge status={payout.status as "pending" | "processing" | "paid" | "failed" | "reversed"} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Phase 14 - Incentive Bonuses Section */}
            {profile.status === "approved" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Incentive Bonuses
                  </CardTitle>
                  <CardDescription>
                    Bonuses earned from incentive programs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {incentivesLoading ? (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      Loading bonuses...
                    </div>
                  ) : incentiveEarnings.length === 0 ? (
                    <EmptyState
                      icon={Award}
                      title="No bonuses yet"
                      description="Complete trips and meet program criteria to earn bonuses!"
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-500/10 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">Total Earned</div>
                          <div className="text-lg font-bold text-green-600" data-testid="text-incentive-earned">
                            ${totalIncentiveEarned.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-yellow-500/10 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">Pending</div>
                          <div className="text-lg font-bold text-yellow-600" data-testid="text-incentive-pending">
                            {pendingIncentives.length}
                          </div>
                        </div>
                      </div>

                      {incentiveEarnings.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Recent Bonuses</div>
                          <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {incentiveEarnings.slice(0, 5).map((earning) => (
                              <div 
                                key={earning.id} 
                                className="flex items-center justify-between py-2 border-b last:border-0"
                                data-testid={`row-incentive-${earning.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  {earning.programType === "trip" && <Target className="h-4 w-4 text-blue-500" />}
                                  {earning.programType === "streak" && <Zap className="h-4 w-4 text-orange-500" />}
                                  {earning.programType === "quality" && <Star className="h-4 w-4 text-yellow-500" />}
                                  {earning.programType === "peak" && <Clock className="h-4 w-4 text-purple-500" />}
                                  {earning.programType === "promo" && <Gift className="h-4 w-4 text-pink-500" />}
                                  <div>
                                    <div className="text-sm font-medium">{earning.programName || "Bonus"}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(earning.earnedAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-sm font-medium ${
                                    earning.status === "paid" ? "text-green-600" :
                                    earning.status === "revoked" ? "text-red-600" :
                                    "text-yellow-600"
                                  }`}>
                                    +${earning.amount}
                                  </div>
                                  <StatusBadge status={earning.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Trip History
                </CardTitle>
                <CardDescription>
                  View your past trips and earnings
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
                    description="Try adjusting your filters or complete some trips"
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
                                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                    ${trip.driverPayout || trip.fareAmount}
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
                              </div>
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
        </div>
      </main>
      <TripDetailModal
        trip={selectedTrip}
        open={tripDetailOpen}
        onOpenChange={setTripDetailOpen}
        userRole="driver"
      />
    </div>
  );
}

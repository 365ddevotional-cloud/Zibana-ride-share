import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Users, 
  Car, 
  MapPin,
  Shield,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  Activity,
  DollarSign,
  TrendingUp,
  Wallet,
  Briefcase,
  Eye,
  Star
} from "lucide-react";
import type { DriverProfile, Trip, User } from "@shared/schema";
import { NotificationBell } from "@/components/notification-bell";

type DriverWithUser = DriverProfile & { email?: string };
type TripWithDetails = Trip & { driverName?: string; riderName?: string };
type RiderWithDetails = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  createdAt?: Date;
};

type PayoutWithDetails = {
  id: string;
  driverId: string;
  tripId?: string;
  type: string;
  amount: string;
  status: string;
  description?: string;
  paidAt?: string;
  paidByAdminId?: string;
  createdAt: string;
  driverName?: string;
};

type DirectorWithDetails = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  status: string;
  createdAt?: string;
};

type RatingWithDetails = {
  id: string;
  tripId: string;
  raterRole: "rider" | "driver";
  raterId: string;
  targetUserId: string;
  score: number;
  comment?: string;
  createdAt: string;
  raterName?: string;
  targetName?: string;
  tripPickup?: string;
  tripDropoff?: string;
};

interface AdminDashboardProps {
  userRole?: "admin" | "director";
}

export default function AdminDashboard({ userRole = "admin" }: AdminDashboardProps) {
  const isDirector = userRole === "director";
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drivers");
  
  const [tripStatusFilter, setTripStatusFilter] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [tripDriverFilter, setTripDriverFilter] = useState("");
  const [tripRiderFilter, setTripRiderFilter] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [tripDetailOpen, setTripDetailOpen] = useState(false);

  const { data: drivers = [], isLoading: driversLoading } = useQuery<DriverWithUser[]>({
    queryKey: ["/api/admin/drivers"],
    enabled: !!user,
  });

  const { data: riders = [], isLoading: ridersLoading } = useQuery<RiderWithDetails[]>({
    queryKey: ["/api/admin/riders"],
    enabled: !!user,
  });

  const buildTripQueryParams = () => {
    const params = new URLSearchParams();
    if (tripStatusFilter && tripStatusFilter !== "all") params.append("status", tripStatusFilter);
    if (tripStartDate) params.append("startDate", tripStartDate);
    if (tripEndDate) params.append("endDate", tripEndDate);
    if (tripDriverFilter) params.append("driverId", tripDriverFilter);
    if (tripRiderFilter) params.append("riderId", tripRiderFilter);
    return params.toString();
  };

  const tripQueryParams = buildTripQueryParams();
  const tripQueryKey = tripQueryParams 
    ? `/api/admin/trips?${tripQueryParams}` 
    : "/api/admin/trips";

  const { data: trips = [], isLoading: tripsLoading } = useQuery<TripWithDetails[]>({
    queryKey: ["/api/admin/trips", tripStatusFilter, tripStartDate, tripEndDate, tripDriverFilter, tripRiderFilter],
    queryFn: async () => {
      const res = await fetch(tripQueryKey, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },
    enabled: !!user,
  });

  const clearTripFilters = () => {
    setTripStatusFilter("");
    setTripStartDate("");
    setTripEndDate("");
    setTripDriverFilter("");
    setTripRiderFilter("");
  };

  const handleTripClick = (trip: TripWithDetails) => {
    setSelectedTrip(trip);
    setTripDetailOpen(true);
  };

  const { data: allRatings = [], isLoading: ratingsLoading } = useQuery<RatingWithDetails[]>({
    queryKey: ["/api/admin/ratings"],
    enabled: !!user,
  });

  const { data: stats } = useQuery<{
    totalDrivers: number;
    pendingDrivers: number;
    totalTrips: number;
    activeTrips: number;
    totalRiders: number;
    completedTrips: number;
    totalFares: string;
    totalCommission: string;
    totalDriverPayouts: string;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
  });

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<PayoutWithDetails[]>({
    queryKey: ["/api/admin/payouts"],
    enabled: !!user,
  });

  const { data: directors = [], isLoading: directorsLoading } = useQuery<DirectorWithDetails[]>({
    queryKey: ["/api/admin/directors"],
    enabled: !!user && !isDirector,
  });

  const updateDriverStatusMutation = useMutation({
    mutationFn: async ({ driverId, status }: { driverId: string; status: string }) => {
      const response = await apiRequest("POST", `/api/admin/driver/${driverId}/status`, { status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Driver status updated",
        description: `Driver has been ${variables.status}`,
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
        description: error.message || "Failed to update driver status",
        variant: "destructive",
      });
    },
  });

  const cancelTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest("POST", `/api/admin/trip/${tripId}/cancel`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Trip cancelled",
        description: "The trip has been cancelled successfully",
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
        description: error.message || "Failed to cancel trip",
        variant: "destructive",
      });
    },
  });

  const markPayoutPaidMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiRequest("POST", `/api/admin/payout/${transactionId}/mark-paid`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Payout marked as paid",
        description: "The payout has been successfully marked as paid",
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
        description: error.message || "Failed to mark payout as paid",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading) {
    return <FullPageLoading text="Loading admin dashboard..." />;
  }

  const pendingDrivers = drivers.filter(d => d.status === "pending");
  const pendingPayouts = payouts.filter(p => p.status === "pending");
  const canCancelTrip = (status: string) => ["requested", "accepted", "in_progress"].includes(status);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isDirector 
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                : "bg-primary/10 text-primary"
            }`}>
              {isDirector ? <Eye className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
              {isDirector ? "Director" : "Admin"}
            </div>
          </div>
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
          <h1 className="text-2xl font-bold">{isDirector ? "Director Dashboard" : "Admin Dashboard"}</h1>
          <p className="text-muted-foreground">
            {isDirector 
              ? "Read-only view of drivers, riders, trips, and payouts" 
              : "Manage drivers, riders, and trips"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalDrivers || 0}</p>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingDrivers || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalRiders || 0}</p>
                <p className="text-sm text-muted-foreground">Total Riders</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalTrips || 0}</p>
                <p className="text-sm text-muted-foreground">Total Trips</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.activeTrips || 0}</p>
                <p className="text-sm text-muted-foreground">Active Trips</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.completedTrips || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed Trips</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-fares">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats?.totalFares || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">Total Fares</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-commission">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats?.totalCommission || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">ZIBA Commission (20%)</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-driver-payouts">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Wallet className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats?.totalDriverPayouts || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">Driver Payouts</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="drivers" data-testid="tab-drivers">
              <Car className="h-4 w-4 mr-2" />
              Drivers
              {pendingDrivers.length > 0 && (
                <span className="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs text-white">
                  {pendingDrivers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="riders" data-testid="tab-riders">
              <Users className="h-4 w-4 mr-2" />
              Riders
            </TabsTrigger>
            <TabsTrigger value="trips" data-testid="tab-trips">
              <MapPin className="h-4 w-4 mr-2" />
              Trips
            </TabsTrigger>
            <TabsTrigger value="payouts" data-testid="tab-payouts">
              <Wallet className="h-4 w-4 mr-2" />
              Payouts
              {pendingPayouts.length > 0 && (
                <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">
                  {pendingPayouts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ratings" data-testid="tab-ratings">
              <Star className="h-4 w-4 mr-2" />
              Ratings
            </TabsTrigger>
            {!isDirector && (
              <TabsTrigger value="directors" data-testid="tab-directors">
                <Briefcase className="h-4 w-4 mr-2" />
                Directors
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle>Driver Management</CardTitle>
                <CardDescription>
                  Approve, suspend, or manage driver accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {driversLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading drivers...
                  </div>
                ) : drivers.length === 0 ? (
                  <EmptyState
                    icon={Car}
                    title="No drivers yet"
                    description="Driver registrations will appear here"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>License Plate</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Online</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.map((driver) => (
                          <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                            <TableCell className="font-medium">{driver.fullName}</TableCell>
                            <TableCell>{driver.phone}</TableCell>
                            <TableCell>{driver.vehicleMake} {driver.vehicleModel}</TableCell>
                            <TableCell>{driver.licensePlate}</TableCell>
                            <TableCell>
                              <StatusBadge status={driver.status} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={driver.isOnline ? "online" : "offline"} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!isDirector && driver.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => updateDriverStatusMutation.mutate({
                                        driverId: driver.userId,
                                        status: "approved"
                                      })}
                                      disabled={updateDriverStatusMutation.isPending}
                                      data-testid={`button-approve-${driver.id}`}
                                    >
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => updateDriverStatusMutation.mutate({
                                        driverId: driver.userId,
                                        status: "suspended"
                                      })}
                                      disabled={updateDriverStatusMutation.isPending}
                                      data-testid={`button-reject-${driver.id}`}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {!isDirector && driver.status === "approved" && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateDriverStatusMutation.mutate({
                                      driverId: driver.userId,
                                      status: "suspended"
                                    })}
                                    disabled={updateDriverStatusMutation.isPending}
                                    data-testid={`button-suspend-${driver.id}`}
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Suspend
                                  </Button>
                                )}
                                {!isDirector && driver.status === "suspended" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateDriverStatusMutation.mutate({
                                      driverId: driver.userId,
                                      status: "approved"
                                    })}
                                    disabled={updateDriverStatusMutation.isPending}
                                    data-testid={`button-reinstate-${driver.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Reinstate
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="riders">
            <Card>
              <CardHeader>
                <CardTitle>Rider List</CardTitle>
                <CardDescription>
                  View all registered riders on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ridersLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading riders...
                  </div>
                ) : riders.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No riders yet"
                    description="Rider registrations will appear here"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riders.map((rider) => (
                          <TableRow key={rider.id} data-testid={`row-rider-${rider.id}`}>
                            <TableCell className="font-medium">{rider.fullName || "-"}</TableCell>
                            <TableCell>{rider.email || "-"}</TableCell>
                            <TableCell>{rider.phone || "-"}</TableCell>
                            <TableCell>
                              {rider.createdAt 
                                ? new Date(rider.createdAt).toLocaleDateString() 
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trips">
            <Card>
              <CardHeader>
                <CardTitle>Trip Management</CardTitle>
                <CardDescription>
                  View and manage all trips across the platform
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
                  driverId={tripDriverFilter}
                  onDriverIdChange={setTripDriverFilter}
                  riderId={tripRiderFilter}
                  onRiderIdChange={setTripRiderFilter}
                  drivers={drivers}
                  riders={riders}
                  showDriverFilter
                  showRiderFilter
                  onClear={clearTripFilters}
                />
                {tripsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading trips...
                  </div>
                ) : trips.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="No trips found"
                    description="Try adjusting your filters or check back later"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rider</TableHead>
                          <TableHead>Pickup</TableHead>
                          <TableHead>Dropoff</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Fare</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trips.map((trip) => (
                          <TableRow 
                            key={trip.id} 
                            data-testid={`row-trip-${trip.id}`}
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleTripClick(trip)}
                          >
                            <TableCell className="font-medium">{trip.riderName || "-"}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{trip.pickupLocation}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{trip.dropoffLocation}</TableCell>
                            <TableCell>
                              <StatusBadge status={trip.status as any} />
                            </TableCell>
                            <TableCell>{trip.driverName || "-"}</TableCell>
                            <TableCell>{trip.fareAmount ? `$${trip.fareAmount}` : "-"}</TableCell>
                            <TableCell>
                              {trip.createdAt 
                                ? new Date(trip.createdAt).toLocaleDateString() 
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isDirector && canCancelTrip(trip.status) && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelTripMutation.mutate(trip.id);
                                  }}
                                  disabled={cancelTripMutation.isPending}
                                  data-testid={`button-cancel-trip-${trip.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <TripDetailModal
              trip={selectedTrip}
              open={tripDetailOpen}
              onOpenChange={setTripDetailOpen}
              userRole={isDirector ? "director" : "admin"}
            />
          </TabsContent>

          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Payout Ledger</CardTitle>
                <CardDescription>
                  Track driver earnings and manage payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payoutsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading payouts...
                  </div>
                ) : payouts.length === 0 ? (
                  <EmptyState
                    icon={Wallet}
                    title="No payouts yet"
                    description="Driver earnings from completed trips will appear here"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Driver</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Paid At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((payout) => (
                          <TableRow key={payout.id} data-testid={`row-payout-${payout.id}`}>
                            <TableCell className="font-medium">{payout.driverName || "-"}</TableCell>
                            <TableCell>
                              <span className="capitalize">{payout.type}</span>
                            </TableCell>
                            <TableCell className="font-semibold text-green-600 dark:text-green-400">
                              ${payout.amount}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={payout.status as any} />
                            </TableCell>
                            <TableCell>
                              {payout.createdAt 
                                ? new Date(payout.createdAt).toLocaleDateString() 
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {payout.paidAt 
                                ? new Date(payout.paidAt).toLocaleDateString() 
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isDirector && payout.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => markPayoutPaidMutation.mutate(payout.id)}
                                  disabled={markPayoutPaidMutation.isPending}
                                  data-testid={`button-mark-paid-${payout.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark Paid
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle>Ratings & Reviews</CardTitle>
                <CardDescription>
                  View all ratings submitted by drivers and riders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ratingsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading ratings...
                  </div>
                ) : allRatings.length === 0 ? (
                  <EmptyState
                    icon={Star}
                    title="No ratings yet"
                    description="Ratings will appear here after trips are completed and rated"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Comment</TableHead>
                          <TableHead>Trip</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allRatings.map((rating) => (
                          <TableRow key={rating.id} data-testid={`rating-row-${rating.id}`}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{rating.raterName}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  ({rating.raterRole})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{rating.targetName}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  ({rating.raterRole === "rider" ? "driver" : "rider"})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= rating.score
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {rating.comment || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              <div className="max-w-32 truncate">
                                {rating.tripPickup} → {rating.tripDropoff}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(rating.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {!isDirector && (
            <TabsContent value="directors">
              <Card>
                <CardHeader>
                  <CardTitle>Directors</CardTitle>
                  <CardDescription>
                    Board members with read-only access to the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {directorsLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading directors...
                    </div>
                  ) : directors.length === 0 ? (
                    <EmptyState
                      icon={Briefcase}
                      title="No directors yet"
                      description="Directors with governance access will appear here"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {directors.map((director) => (
                            <TableRow key={director.id} data-testid={`row-director-${director.id}`}>
                              <TableCell className="font-medium">{director.fullName || "-"}</TableCell>
                              <TableCell>{director.email || "-"}</TableCell>
                              <TableCell>
                                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                                  <Briefcase className="h-3 w-3" />
                                  Director
                                </span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={director.status as any} />
                              </TableCell>
                              <TableCell>
                                {director.createdAt 
                                  ? new Date(director.createdAt).toLocaleDateString() 
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

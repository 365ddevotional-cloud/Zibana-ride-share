import { useState } from "react";
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
  Activity
} from "lucide-react";
import type { DriverProfile, Trip, User } from "@shared/schema";
import { useEffect } from "react";

type DriverWithUser = DriverProfile & { email?: string };
type TripWithDetails = Trip & { driverName?: string; riderName?: string };

export default function AdminDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drivers");

  const { data: drivers = [], isLoading: driversLoading } = useQuery<DriverWithUser[]>({
    queryKey: ["/api/admin/drivers"],
    enabled: !!user,
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery<TripWithDetails[]>({
    queryKey: ["/api/admin/trips"],
    enabled: !!user,
  });

  const { data: stats } = useQuery<{
    totalDrivers: number;
    pendingDrivers: number;
    totalTrips: number;
    activeTrips: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
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

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading) {
    return <FullPageLoading text="Loading admin dashboard..." />;
  }

  const pendingDrivers = drivers.filter(d => d.status === "pending");
  const approvedDrivers = drivers.filter(d => d.status === "approved");
  const suspendedDrivers = drivers.filter(d => d.status === "suspended");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Shield className="h-3 w-3" />
              Admin
            </div>
          </div>
          <div className="flex items-center gap-3">
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
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage drivers, riders, and trips</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="drivers" data-testid="tab-drivers">
              <Car className="h-4 w-4 mr-2" />
              Drivers
            </TabsTrigger>
            <TabsTrigger value="trips" data-testid="tab-trips">
              <MapPin className="h-4 w-4 mr-2" />
              Trips
            </TabsTrigger>
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
                                {driver.status === "pending" && (
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
                                )}
                                {driver.status === "approved" && (
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
                                {driver.status === "suspended" && (
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

          <TabsContent value="trips">
            <Card>
              <CardHeader>
                <CardTitle>Trip History</CardTitle>
                <CardDescription>
                  View all trips across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tripsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading trips...
                  </div>
                ) : trips.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="No trips yet"
                    description="Trip records will appear here"
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
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trips.map((trip) => (
                          <TableRow key={trip.id} data-testid={`row-trip-${trip.id}`}>
                            <TableCell className="font-medium">{trip.riderName || "-"}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{trip.pickupLocation}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{trip.dropoffLocation}</TableCell>
                            <TableCell>
                              <StatusBadge status={trip.status as any} />
                            </TableCell>
                            <TableCell>{trip.driverName || "-"}</TableCell>
                            <TableCell>
                              {trip.createdAt 
                                ? new Date(trip.createdAt).toLocaleDateString() 
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
        </Tabs>
      </main>
    </div>
  );
}

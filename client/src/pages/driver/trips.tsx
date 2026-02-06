import { useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Car, Clock, MapPin, Navigation, Check, FileWarning, Banknote } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TripDetailModal } from "@/components/trip-detail-modal";
import { IncidentReportModal } from "@/components/ride/incident-report-modal";
import type { Trip } from "@shared/schema";

export default function DriverTrips() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentTrip, setIncidentTrip] = useState<Trip | null>(null);

  const { data: tripHistory, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/driver/trip-history"],
    enabled: !!user,
  });

  const { data: currentTrip } = useQuery<Trip | null>({
    queryKey: ["/api/driver/current-trip"],
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: availableRides, refetch: refetchRides } = useQuery<Trip[]>({
    queryKey: ["/api/driver/available-rides"],
    enabled: !!user,
    refetchInterval: 3000,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/trip-history"] });
      toast({
        title: "Status Updated",
        description: "Trip status has been updated",
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

  const activeTrips = tripHistory?.filter(t => t.status === "accepted" || t.status === "in_progress") || [];
  const completedTrips = tripHistory?.filter(t => t.status === "completed") || [];
  const cancelledTrips = tripHistory?.filter(t => t.status === "cancelled") || [];

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setDetailOpen(true);
  };

  const handleReportTrip = (trip: Trip) => {
    setIncidentTrip(trip);
    setIncidentOpen(true);
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold" data-testid="text-trips-title">My Trips</h1>

        {currentTrip && (
          <Card className="border-emerald-500 border-2" data-testid="card-current-trip">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-emerald-600" />
                  Current Trip
                </CardTitle>
                <Badge className="bg-emerald-600">
                  {currentTrip.status === "accepted" ? "En Route" : "In Progress"}
                </Badge>
              </div>
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

        {availableRides && availableRides.length > 0 && !currentTrip && (
          <Card data-testid="card-available-rides">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Available Rides ({availableRides.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableRides.slice(0, 5).map((ride) => (
                <div key={ride.id} className="p-3 border rounded-md space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                    <p className="text-sm flex-1">{ride.pickupLocation}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <p className="text-sm flex-1">{ride.dropoffLocation}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 gap-2">
                    <span className="font-bold">
                      {ride.currencyCode} {parseFloat(ride.fareAmount || "0").toLocaleString()}
                    </span>
                    <Button 
                      size="sm"
                      className="bg-emerald-600"
                      onClick={() => acceptRideMutation.mutate(ride.id)}
                      disabled={acceptRideMutation.isPending}
                      data-testid={`button-accept-${ride.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="completed" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" data-testid="tab-active-trips">
              Active ({activeTrips.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-trips">
              Completed ({completedTrips.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled-trips">
              Cancelled ({cancelledTrips.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-4">
            {activeTrips.length === 0 ? (
              <EmptyState 
                icon={Car} 
                title="No active trips" 
                description="Go online to start receiving ride requests"
              />
            ) : (
              activeTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onClick={() => handleTripClick(trip)} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-4">
            {completedTrips.length === 0 ? (
              <EmptyState 
                icon={Clock} 
                title="No completed trips yet" 
                description="Your completed trips will appear here"
              />
            ) : (
              completedTrips.slice(0, 20).map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  showEarnings 
                  onClick={() => handleTripClick(trip)}
                  onReport={() => handleReportTrip(trip)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-4 space-y-4">
            {cancelledTrips.length === 0 ? (
              <EmptyState 
                icon={MapPin} 
                title="No cancelled trips" 
                description="Cancelled trips will appear here"
              />
            ) : (
              cancelledTrips.slice(0, 20).map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  onClick={() => handleTripClick(trip)}
                  onReport={() => handleReportTrip(trip)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TripDetailModal 
        trip={selectedTrip} 
        open={detailOpen} 
        onOpenChange={setDetailOpen}
        userRole="driver"
      />

      {incidentTrip && (
        <IncidentReportModal
          open={incidentOpen}
          onOpenChange={setIncidentOpen}
          tripId={incidentTrip.id}
          role="driver"
          accusedUserId={incidentTrip.riderId || ""}
        />
      )}
    </DriverLayout>
  );
}

function TripCard({ 
  trip, 
  showEarnings,
  onClick,
  onReport,
}: { 
  trip: Trip; 
  showEarnings?: boolean;
  onClick?: () => void;
  onReport?: () => void;
}) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusColors: Record<string, string> = {
    requested: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const driverPayout = trip.driverPayout ? parseFloat(trip.driverPayout) : 0;
  return (
    <Card 
      className="hover-elevate cursor-pointer" 
      data-testid={`card-trip-${trip.id}`}
      onClick={onClick}
    >
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge className={statusColors[trip.status] || "bg-gray-100 text-gray-800"}>
            {trip.status.replace("_", " ").toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(trip.createdAt)}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
            <p className="text-sm flex-1">{trip.pickupLocation}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <p className="text-sm flex-1">{trip.dropoffLocation}</p>
          </div>
        </div>
        {showEarnings && (
          <div className="pt-2 border-t flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              {trip.paymentSource === "CASH" ? (
                <div className="flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  <p className="font-bold text-emerald-600" data-testid={`text-cash-collected-${trip.id}`}>
                    Cash collected: {trip.currencyCode} {parseFloat(trip.fareAmount || "0").toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="font-bold text-emerald-600" data-testid={`text-earning-${trip.id}`}>
                  +{trip.currencyCode} {driverPayout.toLocaleString()}
                </p>
              )}
            </div>
            {onReport && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); onReport(); }}
                data-testid={`button-report-trip-${trip.id}`}
              >
                <FileWarning className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

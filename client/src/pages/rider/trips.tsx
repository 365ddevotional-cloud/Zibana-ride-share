import { useState, useEffect } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Clock, ChevronRight, Calendar, History, XCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Trip {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: string;
  fareAmount: string | null;
  currencyCode: string;
  createdAt: string;
  completedAt: string | null;
  driverName?: string;
  paymentSource?: string;
  isReserved?: boolean;
  scheduledPickupAt?: string | null;
  reservationStatus?: string | null;
}

export default function RiderTrips() {
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get("tab") === "scheduled" ? "scheduled" : "history";
  const [activeTab, setActiveTab] = useState<"scheduled" | "history">(initialTab);

  const cancelMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await apiRequest("POST", `/api/rider/cancel-ride/${tripId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/trip-history"] });
      toast({ title: "Scheduled ride cancelled", description: "Your scheduled ride has been cancelled." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not cancel", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "scheduled") setActiveTab("scheduled");
  }, []);

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/rider/trip-history"],
  });

  const activeTrip = trips?.find(t =>
    ["pending", "accepted", "in_progress", "driver_arrived"].includes(t.status)
  );

  const scheduledTrips = trips?.filter(t =>
    t.isReserved && t.reservationStatus === "scheduled"
  ) || [];

  const historyTrips = trips?.filter(t =>
    ["completed", "cancelled"].includes(t.status) &&
    !(t.isReserved && t.reservationStatus === "scheduled")
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "accepted": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatCurrency = (amount: string | null, currency: string) => {
    if (!amount) return "\u2014";
    const symbols: Record<string, string> = { NGN: "\u20A6", USD: "$", ZAR: "R" };
    return `${symbols[currency] || currency} ${parseFloat(amount).toLocaleString()}`;
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <h1 className="text-2xl font-bold" data-testid="text-trips-title">Your Trips</h1>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {activeTrip && (
                <Card className="border-primary shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">Active Trip</CardTitle>
                      <Badge className={getStatusColor(activeTrip.status)}>
                        {activeTrip.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pickup</p>
                        <p className="font-medium" data-testid="text-active-pickup">{activeTrip.pickupLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Navigation className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Dropoff</p>
                        <p className="font-medium" data-testid="text-active-dropoff">{activeTrip.dropoffLocation}</p>
                      </div>
                    </div>
                    {activeTrip.fareAmount && (
                      <div className="pt-2 border-t">
                        <p className="text-lg font-bold" data-testid="text-active-fare">
                          {formatCurrency(activeTrip.fareAmount, activeTrip.currencyCode)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-1 p-1 rounded-lg bg-muted">
                <Button
                  variant={activeTab === "scheduled" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setActiveTab("scheduled")}
                  data-testid="tab-scheduled"
                >
                  <Calendar className="h-4 w-4" />
                  Scheduled
                  {scheduledTrips.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{scheduledTrips.length}</Badge>
                  )}
                </Button>
                <Button
                  variant={activeTab === "history" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setActiveTab("history")}
                  data-testid="tab-history"
                >
                  <History className="h-4 w-4" />
                  History
                </Button>
              </div>

              {activeTab === "scheduled" && (
                <div className="space-y-3">
                  {scheduledTrips.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No scheduled rides</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your upcoming rides will appear here
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    scheduledTrips.map((trip) => (
                      <Card key={trip.id} data-testid={`card-scheduled-trip-${trip.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Scheduled
                            </Badge>
                            {trip.scheduledPickupAt && (
                              <span className="text-sm font-medium text-muted-foreground" data-testid={`text-scheduled-time-${trip.id}`}>
                                {format(new Date(trip.scheduledPickupAt), "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <p className="text-sm font-medium" data-testid={`text-scheduled-pickup-${trip.id}`}>
                                {trip.pickupLocation}
                              </p>
                            </div>
                            <div className="flex items-start gap-3">
                              <Navigation className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-sm" data-testid={`text-scheduled-dropoff-${trip.id}`}>
                                {trip.dropoffLocation}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-2 border-t flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                              {trip.paymentSource === "CASH" ? "Cash payment" : "Wallet payment"} &middot; Fare confirmed closer to pickup
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelMutation.mutate(trip.id)}
                              disabled={cancelMutation.isPending}
                              data-testid={`button-cancel-scheduled-${trip.id}`}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-3">
                  {historyTrips.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No trips yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your completed trips will appear here
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    historyTrips.map((trip) => (
                      <Card key={trip.id} className="hover-elevate cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant="outline" className={getStatusColor(trip.status)}>
                                  {trip.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(trip.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="font-medium truncate" data-testid={`text-trip-${trip.id}-destination`}>
                                {trip.dropoffLocation}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                From: {trip.pickupLocation}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 ml-4">
                              <span className="font-bold" data-testid={`text-trip-${trip.id}-fare`}>
                                {formatCurrency(trip.fareAmount, trip.currencyCode)}
                              </span>
                              {trip.paymentSource && (
                                <span className="text-xs text-muted-foreground" data-testid={`text-trip-${trip.id}-payment`}>
                                  {trip.paymentSource === "CASH" ? "Cash" : "Wallet"}
                                </span>
                              )}
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}

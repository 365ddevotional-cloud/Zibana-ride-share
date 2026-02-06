import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation, Clock, Star, Receipt, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
}

export default function RiderTrips() {
  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips/rider"],
  });

  const activeTrip = trips?.find(t => 
    ["pending", "accepted", "in_progress", "driver_arrived"].includes(t.status)
  );

  const completedTrips = trips?.filter(t => 
    ["completed", "cancelled"].includes(t.status)
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
    if (!amount) return "—";
    const symbols: Record<string, string> = { NGN: "₦", USD: "$", ZAR: "R" };
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
                    <div className="flex items-center justify-between">
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

              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Trip History
                </h2>

                {completedTrips.length === 0 ? (
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
                  <div className="space-y-3">
                    {completedTrips.map((trip) => (
                      <Card key={trip.id} className="hover-elevate cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
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
                                  {trip.paymentSource === "CASH" ? "Cash" : "Card"}
                                </span>
                              )}
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}

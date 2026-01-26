import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Navigation, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ReservedTrip {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledPickupAt: string;
  recommendedDepartAt: string;
  reservationStatus: string;
  totalFare: string;
  reservationPremium: string;
  earlyArrivalBonus: string | null;
}

function getTimeUntil(dateString: string): { text: string; urgent: boolean } {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 0) return { text: "Overdue", urgent: true };
  if (diffMins < 30) return { text: `${diffMins} min`, urgent: true };
  if (diffHours < 1) return { text: `${diffMins} min`, urgent: false };
  if (diffHours < 24) return { text: `${diffHours}h ${diffMins % 60}m`, urgent: false };
  return { text: `${Math.floor(diffHours / 24)}d ${diffHours % 24}h`, urgent: false };
}

export function DriverReservedTrips() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations, isLoading } = useQuery<ReservedTrip[]>({
    queryKey: ["/api/reservations/driver/upcoming"],
  });

  const startReservation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/reservations/${id}/start`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Started",
        description: "You are now heading to the pickup location",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/driver/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/current"] });
    },
    onError: (error: any) => {
      toast({
        title: "Could Not Start Trip",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reserved Trips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!reservations || reservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reserved Trips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No reserved trips assigned to you yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Reserved Trips ({reservations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reservations.map((trip) => {
          const scheduledDate = new Date(trip.scheduledPickupAt);
          const departTime = trip.recommendedDepartAt ? new Date(trip.recommendedDepartAt) : null;
          const timeUntil = getTimeUntil(trip.scheduledPickupAt);
          const now = new Date();
          const canStart = departTime && now >= departTime;

          return (
            <div 
              key={trip.id} 
              className={`p-4 border rounded-lg space-y-3 ${timeUntil.urgent ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
              data-testid={`card-reserved-trip-${trip.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <Badge variant={timeUntil.urgent ? "destructive" : "secondary"}>
                  {timeUntil.text}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{trip.pickupAddress || "Pickup location"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{trip.dropoffAddress || "Destination"}</span>
                </div>
              </div>

              {departTime && (
                <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                  <Navigation className="h-4 w-4" />
                  <span>
                    Recommended departure: {departTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">${trip.totalFare}</span>
                  {trip.earlyArrivalBonus && (
                    <Badge variant="outline" className="text-green-600">
                      +${trip.earlyArrivalBonus} bonus
                    </Badge>
                  )}
                </div>
                {canStart && trip.reservationStatus !== "active" && (
                  <Button
                    size="sm"
                    onClick={() => startReservation.mutate(trip.id)}
                    disabled={startReservation.isPending}
                    data-testid={`button-start-trip-${trip.id}`}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Start Trip
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Arrive early to earn a bonus (up to $10)
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

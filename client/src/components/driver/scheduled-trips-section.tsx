import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Play, Check, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScheduledTrip {
  id: string;
  riderId: string;
  driverId: string | null;
  pickupLocation: string;
  dropoffLocation: string;
  status: string;
  fareAmount: string | null;
  currencyCode: string;
  paymentSource: string | null;
  isReserved: boolean;
  scheduledPickupAt: string | null;
  reservationStatus: string | null;
  createdAt: string;
}

function getTimeUntil(dateString: string | null): { text: string; urgent: boolean } {
  if (!dateString) return { text: "Unknown", urgent: false };
  
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

function canStartTrip(dateString: string | null): boolean {
  if (!dateString) return false;
  
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  return diffMins <= 15;
}

export function DriverScheduledTripsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scheduledTrips, isLoading } = useQuery<ScheduledTrip[]>({
    queryKey: ["/api/driver/scheduled-trips"],
  });

  const acceptTrip = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/driver/scheduled-trips/${id}/accept`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Accepted",
        description: "You have accepted this scheduled ride",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/scheduled-trips"] });
    },
    onError: (error: any) => {
      toast({
        title: "Could Not Accept Trip",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const startTrip = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/driver/scheduled-trips/${id}/start`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Started",
        description: "You are now heading to the pickup location",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/scheduled-trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
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
            Upcoming Scheduled Rides
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

  if (!scheduledTrips || scheduledTrips.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Scheduled Rides ({scheduledTrips.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scheduledTrips.map((trip) => {
          const scheduledDate = trip.scheduledPickupAt
            ? new Date(trip.scheduledPickupAt)
            : null;
          const timeUntil = getTimeUntil(trip.scheduledPickupAt);
          const isAccepted =
            trip.status === "accepted" || trip.reservationStatus === "driver_assigned";
          const canStart = canStartTrip(trip.scheduledPickupAt);
          const startDisabled =
            isAccepted && !canStart;

          return (
            <div
              key={trip.id}
              className={`p-4 border rounded-lg space-y-3 ${
                timeUntil.urgent
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                  : ""
              }`}
              data-testid={`card-scheduled-trip-${trip.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {scheduledDate
                      ? `${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" }
                        )}`
                      : "No scheduled time"}
                  </span>
                </div>
                <Badge variant={timeUntil.urgent ? "destructive" : "secondary"}>
                  {timeUntil.text}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{trip.pickupLocation || "Pickup location"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{trip.dropoffLocation || "Destination"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">
                    {trip.fareAmount ? `${trip.fareAmount} ${trip.currencyCode}` : "TBD"}
                  </span>
                  {trip.paymentSource && (
                    <Badge variant="outline" className="text-xs">
                      {trip.paymentSource}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                {!isAccepted ? (
                  <Button
                    size="sm"
                    onClick={() => acceptTrip.mutate(trip.id)}
                    disabled={acceptTrip.isPending}
                    data-testid={`button-accept-trip-${trip.id}`}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                ) : (
                  <>
                    <Badge variant="secondary" className="ml-auto">
                      Accepted
                    </Badge>
                    {startDisabled ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            disabled
                            data-testid={`button-start-trip-${trip.id}`}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Trip
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          You can start this trip 15 minutes before the scheduled time
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startTrip.mutate(trip.id)}
                        disabled={startTrip.isPending}
                        data-testid={`button-start-trip-${trip.id}`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Trip
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

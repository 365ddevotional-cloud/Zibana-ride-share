import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, X, Car } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledPickupAt: string;
  reservationStatus: string;
  totalFare: string;
  reservationPremium: string;
  assignedDriverId: string | null;
}

function ReservationStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    driver_assigned: { label: "Driver Assigned", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    prep_window: { label: "Starting Soon", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    active: { label: "In Progress", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  };

  const variant = variants[status] || { label: status, className: "" };
  return <Badge className={variant.className}>{variant.label}</Badge>;
}

export function UpcomingReservations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations, isLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations/upcoming"],
  });

  const cancelReservation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/reservations/${id}/cancel`, { reason: "Changed plans" });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reservation Cancelled",
        description: "Your scheduled ride has been cancelled",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/upcoming"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Could not cancel reservation",
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
            Upcoming Rides
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
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
            Upcoming Rides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No scheduled rides. Book a reservation to see it here.
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
          Upcoming Rides ({reservations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reservations.map((reservation) => {
          const scheduledDate = new Date(reservation.scheduledPickupAt);
          const now = new Date();
          const hoursUntil = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          const canCancel = hoursUntil > 1;

          return (
            <div 
              key={reservation.id} 
              className="p-4 border rounded-lg space-y-3"
              data-testid={`card-reservation-${reservation.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <ReservationStatusBadge status={reservation.reservationStatus} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{reservation.pickupAddress || "Pickup location"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{reservation.dropoffAddress || "Destination"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  {reservation.assignedDriverId ? (
                    <>
                      <Car className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Driver assigned</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Waiting for driver assignment</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">${reservation.totalFare}</span>
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelReservation.mutate(reservation.id)}
                      disabled={cancelReservation.isPending}
                      data-testid={`button-cancel-reservation-${reservation.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {!canCancel && hoursUntil > 0 && (
                <p className="text-xs text-muted-foreground">
                  Cancellation not available within 1 hour of pickup
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

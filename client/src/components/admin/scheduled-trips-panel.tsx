import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, UserCheck, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

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
  cancelledAt: string | null;
  cancellationReason: string | null;
}

interface DriverInfo {
  userId: string;
  fullName: string;
  status: string;
  isOnline: boolean;
}

function ScheduledTripStatusBadge({ status }: { status: string | null }) {
  const variants: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    driver_assigned: { label: "Driver Assigned", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };

  const variant = variants[status || ""] || { label: status || "Unknown", className: "" };
  return <Badge className={variant.className}>{variant.label}</Badge>;
}

function PaymentMethodBadge({ method }: { method: string | null }) {
  const variants: Record<string, { label: string; className: string }> = {
    CASH: { label: "Cash", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
    MAIN_WALLET: { label: "Wallet", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  };

  const variant = variants[method || ""] || { label: method || "Unknown", className: "" };
  return <Badge className={variant.className}>{variant.label}</Badge>;
}

export function AdminScheduledTripsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});

  const { data: scheduledTrips, isLoading } = useQuery<ScheduledTrip[]>({
    queryKey: ["/api/admin/scheduled-trips"],
  });

  const { data: drivers } = useQuery<DriverInfo[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const assignDriver = useMutation({
    mutationFn: async ({ tripId, driverId }: { tripId: string; driverId: string }) => {
      const res = await apiRequest("POST", `/api/admin/scheduled-trips/${tripId}/assign-driver`, { driverId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Driver Assigned",
        description: "The driver has been assigned to the scheduled trip",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-trips"] });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Could not assign driver",
        variant: "destructive",
      });
    },
  });

  const cancelTrip = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await apiRequest("POST", `/api/admin/scheduled-trips/${tripId}/cancel`, {
        reason: "Cancelled by admin",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Cancelled",
        description: "The scheduled trip has been cancelled",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-trips"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Could not cancel trip",
        variant: "destructive",
      });
    },
  });

  const onlineDrivers = drivers?.filter(d => d.isOnline && d.status === "approved") || [];

  const getDriverName = (driverId: string | null): string => {
    if (!driverId) return "";
    const driver = drivers?.find(d => d.userId === driverId);
    return driver?.fullName || "Unknown Driver";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Rides
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
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
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Rides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No scheduled rides to manage.
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
          Scheduled Rides ({scheduledTrips.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scheduledTrips.map((trip) => {
          const scheduledDate = trip.scheduledPickupAt ? new Date(trip.scheduledPickupAt) : null;
          const now = new Date();
          const hoursUntil = scheduledDate ? (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60) : Infinity;
          const isUrgent = hoursUntil < 2 && hoursUntil > 0;

          return (
            <div
              key={trip.id}
              className={`p-4 border rounded-lg space-y-3 ${isUrgent ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
              data-testid={`admin-scheduled-trip-${trip.id}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {scheduledDate ? (
                      <>
                        {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </>
                    ) : (
                      "No scheduled time"
                    )}
                  </span>
                  {isUrgent && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Urgent
                    </Badge>
                  )}
                </div>
                <ScheduledTripStatusBadge status={trip.reservationStatus} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span data-testid={`text-pickup-location-${trip.id}`}>{trip.pickupLocation || "Pickup location"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span data-testid={`text-dropoff-location-${trip.id}`}>{trip.dropoffLocation || "Destination"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  {trip.paymentSource && (
                    <PaymentMethodBadge method={trip.paymentSource} />
                  )}
                  {trip.driverId && (
                    <div className="flex items-center gap-1 text-sm text-green-600" data-testid={`text-assigned-driver-${trip.id}`}>
                      <UserCheck className="h-4 w-4" />
                      {getDriverName(trip.driverId)}
                    </div>
                  )}
                </div>

                {trip.reservationStatus === "scheduled" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={selectedDriver[trip.id] || ""}
                      onValueChange={(value) => setSelectedDriver(prev => ({ ...prev, [trip.id]: value }))}
                    >
                      <SelectTrigger className="w-[180px]" data-testid={`select-driver-${trip.id}`}>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {onlineDrivers.map((driver) => (
                          <SelectItem key={driver.userId} value={driver.userId}>
                            {driver.fullName}
                          </SelectItem>
                        ))}
                        {onlineDrivers.length === 0 && (
                          <SelectItem value="none" disabled>
                            No drivers online
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedDriver[trip.id]) {
                          assignDriver.mutate({
                            tripId: trip.id,
                            driverId: selectedDriver[trip.id],
                          });
                        }
                      }}
                      disabled={!selectedDriver[trip.id] || assignDriver.isPending}
                      data-testid={`button-assign-driver-${trip.id}`}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cancelTrip.mutate(trip.id)}
                      disabled={cancelTrip.isPending}
                      data-testid={`button-cancel-trip-${trip.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}

                {trip.reservationStatus === "cancelled" && trip.cancellationReason && (
                  <div className="flex items-start gap-2 text-sm text-red-600" data-testid={`text-cancellation-reason-${trip.id}`}>
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Reason: {trip.cancellationReason}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

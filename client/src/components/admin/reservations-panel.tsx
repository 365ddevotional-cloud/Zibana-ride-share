import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, UserCheck, DollarSign, Gift, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
  id: string;
  riderId: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledPickupAt: string;
  reservationStatus: string;
  totalFare: string;
  reservationPremium: string;
  assignedDriverId: string | null;
  earlyArrivalBonus: string | null;
  earlyArrivalBonusPaid: boolean;
}

interface Driver {
  userId: string;
  fullName: string;
  status: string;
  isOnline: boolean;
}

function ReservationStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    driver_assigned: { label: "Driver Assigned", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    prep_window: { label: "Starting Soon", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    active: { label: "In Progress", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    completed: { label: "Completed", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };

  const variant = variants[status] || { label: status, className: "" };
  return <Badge className={variant.className}>{variant.label}</Badge>;
}

export function AdminReservationsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});

  const { data: reservations, isLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations/all"],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const assignDriver = useMutation({
    mutationFn: async ({ rideId, driverId }: { rideId: string; driverId: string }) => {
      const res = await apiRequest("POST", `/api/reservations/${rideId}/assign`, { driverId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Driver Assigned",
        description: "The driver has been assigned to the reservation",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/all"] });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Could not assign driver",
        variant: "destructive",
      });
    },
  });

  const applyBonus = useMutation({
    mutationFn: async (rideId: string) => {
      const res = await apiRequest("POST", `/api/reservations/${rideId}/early-bonus`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Bonus Applied",
        description: "Early arrival bonus has been credited to the driver",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/all"] });
    },
    onError: (error: any) => {
      toast({
        title: "Bonus Failed",
        description: error.message || "Could not apply bonus",
        variant: "destructive",
      });
    },
  });

  const onlineDrivers = drivers?.filter(d => d.isOnline && d.status === "approved") || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Reservations
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

  if (!reservations || reservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Reservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No upcoming reservations to manage.
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
          Upcoming Reservations ({reservations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reservations.map((reservation) => {
          const scheduledDate = new Date(reservation.scheduledPickupAt);
          const now = new Date();
          const hoursUntil = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          const isUrgent = hoursUntil < 2;

          return (
            <div 
              key={reservation.id} 
              className={`p-4 border rounded-lg space-y-3 ${isUrgent ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
              data-testid={`admin-reservation-${reservation.id}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isUrgent && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Urgent
                    </Badge>
                  )}
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

              <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">${reservation.totalFare}</span>
                  </div>
                  {reservation.earlyArrivalBonus && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Gift className="h-4 w-4" />
                      <span>+${reservation.earlyArrivalBonus} bonus</span>
                    </div>
                  )}
                </div>

                {reservation.reservationStatus === "scheduled" && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedDriver[reservation.id] || ""}
                      onValueChange={(value) => setSelectedDriver(prev => ({ ...prev, [reservation.id]: value }))}
                    >
                      <SelectTrigger className="w-[180px]" data-testid={`select-driver-${reservation.id}`}>
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
                        if (selectedDriver[reservation.id]) {
                          assignDriver.mutate({ 
                            rideId: reservation.id, 
                            driverId: selectedDriver[reservation.id] 
                          });
                        }
                      }}
                      disabled={!selectedDriver[reservation.id] || assignDriver.isPending}
                      data-testid={`button-assign-driver-${reservation.id}`}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                )}

                {reservation.reservationStatus === "completed" && 
                 reservation.assignedDriverId && 
                 !reservation.earlyArrivalBonusPaid && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyBonus.mutate(reservation.id)}
                    disabled={applyBonus.isPending}
                    data-testid={`button-apply-bonus-${reservation.id}`}
                  >
                    <Gift className="h-4 w-4 mr-1" />
                    Calculate Bonus
                  </Button>
                )}

                {reservation.assignedDriverId && reservation.reservationStatus !== "scheduled" && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <UserCheck className="h-4 w-4" />
                    Driver assigned
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

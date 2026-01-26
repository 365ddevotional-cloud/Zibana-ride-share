import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, Users, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReservationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReservationForm({ onSuccess, onCancel }: ReservationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [passengerCount, setPassengerCount] = useState(1);

  const createReservation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/reservations", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reservation Confirmed",
        description: "Your scheduled ride has been booked successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/upcoming"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Could not create reservation",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pickupAddress || !dropoffAddress || !scheduledDate || !scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const scheduledPickupAt = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();
    const minTime = new Date(now.getTime() + 60 * 60 * 1000);

    if (scheduledPickupAt < minTime) {
      toast({
        title: "Invalid Time",
        description: "Scheduled pickup must be at least 1 hour from now",
        variant: "destructive",
      });
      return;
    }

    const pickupLat = 40.7128 + (Math.random() - 0.5) * 0.1;
    const pickupLng = -74.0060 + (Math.random() - 0.5) * 0.1;
    const dropoffLat = pickupLat + (Math.random() - 0.5) * 0.05;
    const dropoffLng = pickupLng + (Math.random() - 0.5) * 0.05;

    createReservation.mutate({
      pickupAddress,
      dropoffAddress,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      scheduledPickupAt: scheduledPickupAt.toISOString(),
      passengerCount,
    });
  };

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule a Ride
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pickup" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-500" />
              Pickup Location
            </Label>
            <Input
              id="pickup"
              data-testid="input-pickup-address"
              placeholder="Enter pickup address"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropoff" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              Dropoff Location
            </Label>
            <Input
              id="dropoff"
              data-testid="input-dropoff-address"
              placeholder="Enter destination address"
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                data-testid="input-scheduled-date"
                min={minDate}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                data-testid="input-scheduled-time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passengers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Passengers
            </Label>
            <Input
              id="passengers"
              type="number"
              data-testid="input-passenger-count"
              min={1}
              max={6}
              value={passengerCount}
              onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="bg-muted p-4 rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              <span className="text-muted-foreground">Reservation includes a $5.00 premium for guaranteed pickup</span>
            </div>
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1" data-testid="button-cancel-reservation-form">
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={createReservation.isPending}
              data-testid="button-submit-reservation"
            >
              {createReservation.isPending ? "Booking..." : "Book Ride"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

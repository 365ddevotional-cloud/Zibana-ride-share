import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CountdownTimer } from "./countdown-timer";
import { MapPin, Users, Clock, Navigation } from "lucide-react";
import type { RideWithDetails } from "@/hooks/use-ride-lifecycle";

interface DriverRideCardProps {
  ride: RideWithDetails;
  onAccept: (rideId: string) => void;
  isAccepting?: boolean;
  countdownSeconds?: number;
}

export function DriverRideCard({ 
  ride, 
  onAccept, 
  isAccepting = false,
  countdownSeconds = 10 
}: DriverRideCardProps) {
  const [expired, setExpired] = useState(false);
  const [startTime] = useState(() => Date.now());

  const handleExpire = useCallback(() => {
    setExpired(true);
  }, []);

  const handleAccept = () => {
    if (!expired && !isAccepting) {
      onAccept(ride.id);
    }
  };

  const estimatedDistance = ride.estimatedDistanceKm 
    ? `${parseFloat(ride.estimatedDistanceKm).toFixed(1)} km`
    : "Calculating...";
    
  const estimatedDuration = ride.estimatedDurationMin
    ? `${ride.estimatedDurationMin} min`
    : "Calculating...";

  if (expired) {
    return null;
  }

  return (
    <Card 
      className="border-primary ring-2 ring-primary/20 animate-in fade-in slide-in-from-top-2"
      data-testid={`ride-request-card-${ride.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Navigation className="h-5 w-5 text-primary" />
            New Ride Request
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {ride.passengerCount} {ride.passengerCount === 1 ? "passenger" : "passengers"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <CountdownTimer
          durationSeconds={countdownSeconds}
          onExpire={handleExpire}
          label="Accept within"
          showProgress={true}
        />

        <Separator />

        <div className="space-y-3">
          {ride.riderName && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{ride.riderName}</span>
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="font-medium">{ride.pickupAddress}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Dropoff</p>
              <p className="font-medium">{ride.dropoffAddress}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <span>{estimatedDistance}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{estimatedDuration}</span>
          </div>
        </div>

        <Button 
          className="w-full h-12 text-lg font-semibold"
          onClick={handleAccept}
          disabled={expired || isAccepting}
          data-testid={`button-accept-ride-${ride.id}`}
        >
          {isAccepting ? "Accepting..." : "Accept Ride"}
        </Button>
      </CardContent>
    </Card>
  );
}

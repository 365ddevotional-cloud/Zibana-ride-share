import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Clock, DollarSign, Check, X } from "lucide-react";
import { useNotificationSound } from "@/hooks/use-notification-sound";

interface RideOfferCountdownProps {
  offerId: string;
  rideId: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare?: string;
  expiresAt: Date;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string) => void;
  isAccepting?: boolean;
}

export function RideOfferCountdown({
  offerId,
  rideId,
  pickupAddress,
  dropoffAddress,
  estimatedFare,
  expiresAt,
  onAccept,
  onDecline,
  isAccepting = false,
}: RideOfferCountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(10);
  const [progress, setProgress] = useState(100);
  const { playSound, stopSound } = useNotificationSound();

  const calculateRemaining = useCallback(() => {
    const now = Date.now();
    const expiry = new Date(expiresAt).getTime();
    const remaining = Math.max(0, Math.ceil((expiry - now) / 1000));
    return remaining;
  }, [expiresAt]);

  useEffect(() => {
    playSound("rideOffer");
    
    return () => {
      stopSound();
    };
  }, [playSound, stopSound]);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);
      setProgress((remaining / 10) * 100);

      if (remaining <= 0) {
        onDecline(offerId);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 100);
    
    return () => clearInterval(interval);
  }, [calculateRemaining, offerId, onDecline]);

  const getProgressColor = () => {
    if (remainingSeconds <= 3) return "bg-red-500";
    if (remainingSeconds <= 5) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card className="border-primary shadow-lg animate-pulse" data-testid="ride-offer-countdown">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary animate-pulse" />
            New Ride Request
          </CardTitle>
          <Badge variant={remainingSeconds <= 3 ? "destructive" : "secondary"}>
            {remainingSeconds}s
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full transition-all duration-100 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium line-clamp-2">{pickupAddress}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Dropoff</p>
              <p className="text-sm font-medium line-clamp-2">{dropoffAddress}</p>
            </div>
          </div>

          {estimatedFare && (
            <div className="flex items-center gap-2 pt-1">
              <DollarSign className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-primary">
                Est. Fare: ${estimatedFare}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onDecline(offerId)}
            disabled={isAccepting}
            data-testid="button-decline-offer"
          >
            <X className="h-4 w-4 mr-1" />
            Decline
          </Button>
          <Button
            className="flex-1"
            onClick={() => onAccept(offerId)}
            disabled={isAccepting}
            data-testid="button-accept-offer"
          >
            <Check className="h-4 w-4 mr-1" />
            {isAccepting ? "Accepting..." : "Accept"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

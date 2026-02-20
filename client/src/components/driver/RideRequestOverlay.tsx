import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Navigation, Clock, DollarSign, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trip } from "@shared/schema";

interface RideRequestOverlayProps {
  ride: Trip;
  onAccept: (tripId: string) => void;
  onDecline: (tripId: string) => void;
  isAccepting: boolean;
  riderName?: string;
  riderRating?: string;
}

const COUNTDOWN_SECONDS = 12;

export function RideRequestOverlay({
  ride,
  onAccept,
  onDecline,
  isAccepting,
  riderName,
  riderRating,
}: RideRequestOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(Date.now());

  const handleDecline = useCallback(() => {
    setDismissed(true);
    onDecline(ride.id);
  }, [ride.id, onDecline]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setTimeLeft(COUNTDOWN_SECONDS);
    setDismissed(false);

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, COUNTDOWN_SECONDS - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleDecline();
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ride.id, handleDecline]);

  if (dismissed) return null;

  const progress = timeLeft / COUNTDOWN_SECONDS;
  const barColor = progress > 0.5
    ? "from-emerald-500 to-yellow-400"
    : progress > 0.25
      ? "from-yellow-400 to-orange-500"
      : "from-orange-500 to-red-500";

  const fare = parseFloat(ride.fareAmount || "0");
  const pickupShort = ride.pickupLocation
    ? ride.pickupLocation.split(",")[0].trim()
    : "Pickup location";
  const dropoffShort = ride.dropoffLocation
    ? ride.dropoffLocation.split(",")[0].trim()
    : "Dropoff area";

  const displayName = riderName || "Rider";
  const displayRating = riderRating ? parseFloat(riderRating) : 5.0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      data-testid="overlay-ride-request"
    >
      <div className="w-full max-w-lg mx-auto bg-background rounded-t-3xl shadow-2xl border-t border-border p-6 pb-8 animate-in slide-in-from-bottom duration-300">
        <div className="w-full h-2 rounded-full bg-muted mb-5 overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-none", barColor)}
            style={{ width: `${progress * 100}%` }}
            data-testid="bar-countdown"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg" data-testid="text-rider-name">{displayName}</p>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-muted-foreground" data-testid="text-rider-rating">
                  {displayRating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Est. Fare</p>
            <p className="text-2xl font-bold text-emerald-600" data-testid="text-fare">
              {ride.currencyCode || "₦"}{fare.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-3">
            <div className="mt-1.5 w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">PICKUP</p>
              <p className="font-medium truncate" data-testid="text-pickup">{pickupShort}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1.5 w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">DROPOFF</p>
              <p className="font-medium truncate" data-testid="text-dropoff">{dropoffShort}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mb-6 text-sm text-muted-foreground">
          {(ride as any).estimatedDistance && (
            <div className="flex items-center gap-1.5">
              <Navigation className="h-4 w-4" />
              <span data-testid="text-distance">{(ride as any).estimatedDistance}</span>
            </div>
          )}
          {(ride as any).estimatedDuration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span data-testid="text-duration">{(ride as any).estimatedDuration}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-14 text-base border-2"
            onClick={() => handleDecline()}
            data-testid="button-decline-ride"
          >
            <X className="h-5 w-5 mr-2" />
            Decline
          </Button>
          <Button
            size="lg"
            className="flex-1 h-14 text-base bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onAccept(ride.id)}
            disabled={isAccepting}
            data-testid="button-accept-ride-overlay"
          >
            <Check className="h-5 w-5 mr-2" />
            {isAccepting ? "Accepting..." : "Accept"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Auto-declines in {Math.ceil(timeLeft)}s
        </p>
      </div>
    </div>
  );
}

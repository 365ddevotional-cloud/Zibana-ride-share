import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RideStatusTimeline } from "./ride-status-timeline";
import { SafetyCheckModal } from "./safety-check-modal";
import { WaitingTimer } from "./waiting-timer";
import { 
  Car, 
  MapPin, 
  Users, 
  Phone, 
  Star, 
  XCircle,
  Clock,
  Navigation,
  Shield
} from "lucide-react";
import type { RideWithDetails, RideStatus } from "@/hooks/use-ride-lifecycle";

interface RiderRideStatusProps {
  ride: RideWithDetails;
  onCancel: (rideId: string, reason?: string) => void;
  onSafetyResponse: (rideId: string, response: "safe" | "need_help") => void;
  isCancelling?: boolean;
  showSafetyCheck?: boolean;
}

export function RiderRideStatus({ 
  ride, 
  onCancel, 
  onSafetyResponse,
  isCancelling = false,
  showSafetyCheck = false
}: RiderRideStatusProps) {
  const [safetyModalOpen, setSafetyModalOpen] = useState(showSafetyCheck);

  const status = ride.status as RideStatus;
  
  const canCancel = ["requested", "matching", "accepted", "driver_en_route", "arrived", "waiting"].includes(status);
  const showDriver = ["accepted", "driver_en_route", "arrived", "waiting", "in_progress"].includes(status);
  const showWaitingTimer = status === "waiting" && ride.arrivedAt;

  const getStatusMessage = () => {
    switch (status) {
      case "requested":
      case "matching":
        return { text: "Looking for a driver...", animate: true };
      case "accepted":
        return { text: "Driver accepted your ride!", animate: false };
      case "driver_en_route":
        return { text: "Driver is on the way to pick you up", animate: true };
      case "arrived":
        return { text: "Driver has arrived at pickup location", animate: false };
      case "waiting":
        return { text: "Driver is waiting for you", animate: true };
      case "in_progress":
        return { text: "You're on your way to your destination!", animate: false };
      case "completed":
        return { text: "Trip completed", animate: false };
      case "cancelled":
        return { text: "Ride was cancelled", animate: false };
      default:
        return { text: "", animate: false };
    }
  };

  const statusMessage = getStatusMessage();

  const handleCall = () => {
    if (ride.driverPhone) {
      window.location.href = `tel:${ride.driverPhone}`;
    }
  };

  return (
    <>
      <Card className="border-primary" data-testid="rider-ride-status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Current Ride
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <RideStatusTimeline currentStatus={status} />

          <Separator />

          <div className={`flex items-center gap-2 text-sm ${
            statusMessage.animate ? "text-primary" : "text-muted-foreground"
          }`}>
            {statusMessage.animate && <Clock className="h-4 w-4 animate-pulse" />}
            {!statusMessage.animate && status === "in_progress" && (
              <Navigation className="h-4 w-4 text-green-500" />
            )}
            <span>{statusMessage.text}</span>
          </div>

          {showDriver && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {ride.driverName?.charAt(0) || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{ride.driverName || "Driver"}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {ride.driverRating && (
                        <>
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{parseFloat(ride.driverRating).toFixed(1)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {ride.driverPhone && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCall}
                    data-testid="button-call-driver"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {(ride.driverVehicle || ride.driverLicensePlate) && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span>{ride.driverVehicle}</span>
                  {ride.driverLicensePlate && (
                    <Badge variant="outline" className="ml-auto">
                      {ride.driverLicensePlate}
                    </Badge>
                  )}
                </div>
              )}
            </>
          )}

          {showWaitingTimer && (
            <WaitingTimer 
              arrivedAt={ride.arrivedAt!}
              waitingStartedAt={ride.waitingStartedAt}
            />
          )}

          <Separator />

          <div className="space-y-3">
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

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{ride.passengerCount} passenger(s)</span>
          </div>

          {status === "in_progress" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSafetyModalOpen(true)}
              data-testid="button-safety-check"
            >
              <Shield className="h-4 w-4 mr-2" />
              Safety Check
            </Button>
          )}

          {canCancel && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onCancel(ride.id)}
              disabled={isCancelling}
              data-testid="button-cancel-ride"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {isCancelling ? "Cancelling..." : "Cancel Ride"}
            </Button>
          )}
        </CardContent>
      </Card>

      <SafetyCheckModal
        open={safetyModalOpen}
        onOpenChange={setSafetyModalOpen}
        onSafe={() => onSafetyResponse(ride.id, "safe")}
        onNeedHelp={() => onSafetyResponse(ride.id, "need_help")}
        role="rider"
      />
    </>
  );
}

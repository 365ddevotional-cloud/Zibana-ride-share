import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RideStatusTimeline } from "./ride-status-timeline";
import { SafetyCheckModal } from "./safety-check-modal";
import { WaitingTimer } from "./waiting-timer";
import { openNativeNavigation } from "@/lib/navigation";
import { 
  Car, 
  MapPin, 
  Users, 
  Phone, 
  Navigation,
  MapPinned,
  Timer,
  Play,
  CheckCircle,
  XCircle,
  Shield,
  DollarSign
} from "lucide-react";
import type { RideWithDetails, RideStatus } from "@/hooks/use-ride-lifecycle";

interface DriverRideActionsProps {
  ride: RideWithDetails;
  onStartPickup: (rideId: string) => void;
  onArrive: (rideId: string) => void;
  onStartWaiting: (rideId: string) => void;
  onStartTrip: (rideId: string) => void;
  onComplete: (rideId: string) => void;
  onCancel: (rideId: string, reason?: string) => void;
  onSafetyResponse: (rideId: string, response: "safe" | "need_help") => void;
  isPending?: boolean;
  showSafetyCheck?: boolean;
}

const CANCEL_REASONS = [
  "Rider not at pickup location",
  "Rider requested cancellation",
  "Safety concern",
  "Vehicle issue",
  "Personal emergency",
  "Other",
];

export function DriverRideActions({ 
  ride, 
  onStartPickup,
  onArrive,
  onStartWaiting,
  onStartTrip,
  onComplete,
  onCancel,
  onSafetyResponse,
  isPending = false,
  showSafetyCheck = false
}: DriverRideActionsProps) {
  const [safetyModalOpen, setSafetyModalOpen] = useState(showSafetyCheck);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [earlyEndModalOpen, setEarlyEndModalOpen] = useState(false);

  const status = ride.status as RideStatus;
  
  const showWaitingTimer = ["arrived", "waiting"].includes(status) && ride.arrivedAt;

  const handleStartPickup = () => {
    onStartPickup(ride.id);
    if (ride.pickupAddress) {
      openNativeNavigation(ride.pickupAddress, ride.pickupLat ? parseFloat(ride.pickupLat) : undefined, ride.pickupLng ? parseFloat(ride.pickupLng) : undefined);
    }
  };

  const handleStartTrip = () => {
    onStartTrip(ride.id);
    if (ride.dropoffAddress) {
      openNativeNavigation(ride.dropoffAddress, ride.dropoffLat ? parseFloat(ride.dropoffLat) : undefined, ride.dropoffLng ? parseFloat(ride.dropoffLng) : undefined);
    }
  };

  const handleCancel = () => {
    if (status === "in_progress" && !cancelReason) {
      return;
    }
    onCancel(ride.id, cancelReason || undefined);
    setCancelModalOpen(false);
    setCancelReason("");
  };

  const handleEarlyEnd = (isComplete: boolean) => {
    setEarlyEndModalOpen(false);
    if (isComplete) {
      onComplete(ride.id);
    }
  };

  const handleCall = () => {
    if (ride.riderName) {
      window.location.href = `tel:`;
    }
  };

  const getActionButton = () => {
    switch (status) {
      case "accepted":
        return (
          <Button
            className="w-full h-12 text-lg font-semibold"
            onClick={handleStartPickup}
            disabled={isPending}
            data-testid="button-start-pickup"
          >
            <Navigation className="h-5 w-5 mr-2" />
            Start Pickup
          </Button>
        );
      case "driver_en_route":
        return (
          <Button
            className="w-full h-12 text-lg font-semibold"
            onClick={() => onArrive(ride.id)}
            disabled={isPending}
            data-testid="button-arrived"
          >
            <MapPinned className="h-5 w-5 mr-2" />
            Arrived at Pickup
          </Button>
        );
      case "arrived":
        return (
          <div className="space-y-3">
            <Button
              className="w-full h-12 text-lg font-semibold"
              onClick={() => onStartWaiting(ride.id)}
              disabled={isPending}
              data-testid="button-start-waiting"
            >
              <Timer className="h-5 w-5 mr-2" />
              Start Waiting
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleStartTrip}
              disabled={isPending}
              data-testid="button-start-trip-early"
            >
              <Play className="h-4 w-4 mr-2" />
              Rider is Here - Start Trip
            </Button>
          </div>
        );
      case "waiting":
        return (
          <Button
            className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
            onClick={handleStartTrip}
            disabled={isPending}
            data-testid="button-start-trip"
          >
            <Play className="h-5 w-5 mr-2" />
            Rider Entered - Start Trip
          </Button>
        );
      case "in_progress":
        return (
          <div className="space-y-3">
            <Button
              className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
              onClick={() => onComplete(ride.id)}
              disabled={isPending}
              data-testid="button-complete-trip"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Complete Trip
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setEarlyEndModalOpen(true)}
              data-testid="button-early-end"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Rider Wants to Stop Early
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const canCancel = ["accepted", "driver_en_route", "arrived", "waiting", "in_progress"].includes(status);
  const requiresCancelReason = status === "in_progress";

  return (
    <>
      <Card className="border-primary" data-testid="driver-ride-actions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Current Ride
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <RideStatusTimeline currentStatus={status} />

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {ride.riderName?.charAt(0) || "R"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{ride.riderName || "Rider"}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{ride.passengerCount} passenger(s)</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCall}
              data-testid="button-call-rider"
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>

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
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium">{ride.pickupAddress}</p>
              </div>
              {["accepted", "driver_en_route"].includes(status) && ride.pickupAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openNativeNavigation(ride.pickupAddress!)}
                  data-testid="button-nav-pickup"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Dropoff</p>
                <p className="font-medium">{ride.dropoffAddress}</p>
              </div>
              {status === "in_progress" && ride.dropoffAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openNativeNavigation(ride.dropoffAddress!)}
                  data-testid="button-nav-dropoff"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {ride.baseFare && (
            <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
              <span className="text-muted-foreground">Estimated Fare</span>
              <span className="font-bold text-lg">${ride.baseFare}</span>
            </div>
          )}

          <div className="pt-2 space-y-3">
            {getActionButton()}

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
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setCancelModalOpen(true)}
                disabled={isPending}
                data-testid="button-cancel-ride"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Ride
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <SafetyCheckModal
        open={safetyModalOpen}
        onOpenChange={setSafetyModalOpen}
        onSafe={() => onSafetyResponse(ride.id, "safe")}
        onNeedHelp={() => onSafetyResponse(ride.id, "need_help")}
        role="driver"
      />

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent data-testid="cancel-ride-modal">
          <DialogHeader>
            <DialogTitle>Cancel Ride</DialogTitle>
            <DialogDescription>
              {requiresCancelReason 
                ? "Please select a reason for cancellation. This helps us improve our service."
                : "Are you sure you want to cancel this ride?"
              }
            </DialogDescription>
          </DialogHeader>
          
          {requiresCancelReason && (
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger data-testid="select-cancel-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCancelModalOpen(false)}
            >
              Keep Ride
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleCancel}
              disabled={requiresCancelReason && !cancelReason}
              data-testid="button-confirm-cancel"
            >
              Cancel Ride
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={earlyEndModalOpen} onOpenChange={setEarlyEndModalOpen}>
        <DialogContent data-testid="early-end-modal">
          <DialogHeader>
            <DialogTitle>Early Destination Stop</DialogTitle>
            <DialogDescription>
              Is this the completed destination? The fare will be recalculated based on the actual distance traveled.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleEarlyEnd(false)}
            >
              No, Continue Trip
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleEarlyEnd(true)}
              data-testid="button-confirm-early-end"
            >
              Yes, End Trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
